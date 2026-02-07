const pool = require('../config/database');

/**
 * ============================================
 * DEBIT/CREDIT NOTE LOGIC DOCUMENTATION
 * ============================================
 * 
 * ## CUSTOMER (Sales Side)
 * 
 * ### Credit Note (Issued to Customer)
 * - Meaning: We reduce the amount the customer has to pay us
 * - Reasons: Sales return, overcharged, discount, damaged goods returned
 * - Impact: Customer balance DECREASES (they owe us less)
 * - Our sales revenue DECREASES
 * - current_balance = current_balance - credit_note_amount
 * 
 * ### Debit Note (Issued to Customer)
 * - Meaning: We increase the amount the customer has to pay us
 * - Reasons: Additional charges (freight, packing, late fee), price increase, extra quantity
 * - Impact: Customer balance INCREASES (they owe us more)
 * - Our revenue INCREASES
 * - current_balance = current_balance + debit_note_amount
 * 
 * ## VENDOR (Purchase Side)
 * 
 * ### Debit Note (Issued to Vendor)
 * - Meaning: We reduce the amount we need to pay the vendor
 * - Reasons: Purchase return, vendor overcharged, damaged goods, post-invoice discount
 * - Impact: Vendor balance DECREASES (we owe them less)
 * - Our purchase cost DECREASES
 * - current_balance = current_balance - debit_note_amount
 * 
 * ### Credit Note (Received from Vendor / Issued by Vendor)
 * - Meaning: We increase the amount we need to pay the vendor
 * - Reasons: Additional charges from vendor, price revision upward, missed charges
 * - Impact: Vendor balance INCREASES (we owe them more)
 * - Our purchase cost INCREASES
 * - current_balance = current_balance + credit_note_amount
 * 
 * ============================================
 * BALANCE INTERPRETATION
 * ============================================
 * 
 * Customer Balance (current_balance):
 * - Positive value: Customer owes us money
 * - Negative value: We owe the customer (credit balance/advance payment)
 * 
 * Vendor Balance (current_balance):
 * - Positive value: We owe the vendor money
 * - Negative value: Vendor owes us (advance payment made)
 * 
 */

const DebitCreditNote = {
  /**
   * ============================================
   * CUSTOMER DEBIT NOTES
   * ============================================
   * Debit Note to Customer: INCREASES what customer owes us
   */

  // Create customer debit note
  createCustomerDebitNote: async (debitNote, db = pool) => {
    const {
      customer_id,
      debit_note_number,
      billing_id,
      reason,
      amount,
      description,
      created_by,
      items = [],
    } = debitNote;

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Create debit note
      const result = await client.query(
        `INSERT INTO customer_debit_notes 
         (customer_id, debit_note_number, billing_id, reason, amount, description, created_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         RETURNING *`,
        [customer_id, debit_note_number, billing_id, reason, amount, description, created_by]
      );

      const debitNoteRecord = result.rows[0];

      // Create debit note items if provided
      if (items && items.length > 0) {
        for (const item of items) {
          await client.query(
            `INSERT INTO debit_note_items 
             (customer_debit_note_id, product_id, product_name, quantity, unit_price, amount)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [debitNoteRecord.id, item.product_id, item.product_name || null, item.quantity, item.unit_price, item.amount]
          );
        }
      }

      // Update customer balance - Debit Note INCREASES customer's payable (they owe us more)
      await client.query(
        `UPDATE customer_balance 
         SET current_balance = current_balance + $1,
             total_debit = total_debit + $1,
             last_updated = CURRENT_TIMESTAMP
         WHERE customer_id = $2`,
        [amount, customer_id]
      );

      // Add entry to ledger
      await client.query(
        `INSERT INTO customer_ledger 
         (customer_id, billing_id, transaction_type, amount, description)
         VALUES ($1, $2, 'debit_note', $3, $4)`,
        [customer_id, billing_id, amount, `Debit Note: ${debit_note_number} - ${reason}`]
      );

      await client.query('COMMIT');
      return debitNoteRecord;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Get customer debit notes
  getCustomerDebitNotes: async (customerId, db = pool) => {
    const result = await db.query(
      `SELECT cdn.*, b.invoice_number 
       FROM customer_debit_notes cdn
       LEFT JOIN billing b ON cdn.billing_id = b.id
       WHERE cdn.customer_id = $1 
       ORDER BY cdn.note_date DESC`,
      [customerId]
    );
    return result.rows;
  },

  // Get single customer debit note by ID
  getCustomerDebitNoteById: async (debitNoteId, db = pool) => {
    const result = await db.query(
      `SELECT cdn.*, b.invoice_number, c.name as customer_name
       FROM customer_debit_notes cdn
       LEFT JOIN billing b ON cdn.billing_id = b.id
       LEFT JOIN customers c ON cdn.customer_id = c.id
       WHERE cdn.id = $1`,
      [debitNoteId]
    );
    return result.rows[0];
  },

  // Approve customer debit note
  approveCustomerDebitNote: async (debitNoteId, db = pool) => {
    const result = await db.query(
      `UPDATE customer_debit_notes 
       SET status = 'approved', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 
       RETURNING *`,
      [debitNoteId]
    );
    return result.rows[0];
  },

  // Cancel customer debit note
  cancelCustomerDebitNote: async (debitNoteId, db = pool) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Get debit note details
      const noteResult = await client.query(
        `SELECT * FROM customer_debit_notes WHERE id = $1`,
        [debitNoteId]
      );
      const note = noteResult.rows[0];

      if (!note) throw new Error('Debit note not found');
      if (note.status === 'cancelled') throw new Error('Debit note is already cancelled');

      // Reverse the balance - Debit increased balance, so subtract to reverse
      await client.query(
        `UPDATE customer_balance 
         SET current_balance = current_balance - $1,
             total_debit = total_debit - $1,
             last_updated = CURRENT_TIMESTAMP
         WHERE customer_id = $2`,
        [note.amount, note.customer_id]
      );

      // Add reversal entry to ledger
      await client.query(
        `INSERT INTO customer_ledger 
         (customer_id, billing_id, transaction_type, amount, description)
         VALUES ($1, $2, 'dn_cancelled', $3, $4)`,
        [note.customer_id, note.billing_id, -note.amount, `Debit Note Cancelled: ${note.debit_note_number}`]
      );

      // Update note status
      const updated = await client.query(
        `UPDATE customer_debit_notes 
         SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 
         RETURNING *`,
        [debitNoteId]
      );

      await client.query('COMMIT');
      return updated.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Update customer debit note
  updateCustomerDebitNote: async (debitNoteId, updates, db = pool) => {
    const { reason, amount, description, items } = updates;
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Get old debit note
      const oldNoteResult = await client.query(
        `SELECT * FROM customer_debit_notes WHERE id = $1`,
        [debitNoteId]
      );
      const oldNote = oldNoteResult.rows[0];

      if (!oldNote) throw new Error('Debit note not found');
      if (oldNote.status !== 'pending') throw new Error('Can only edit debit notes in pending status');

      // Update note
      const result = await client.query(
        `UPDATE customer_debit_notes 
         SET reason = $1, amount = $2, description = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 
         RETURNING *`,
        [reason || oldNote.reason, amount !== undefined ? amount : oldNote.amount, description || oldNote.description, debitNoteId]
      );

      // If amount changed, update balance
      if (amount !== undefined && amount !== oldNote.amount) {
        const difference = amount - oldNote.amount;
        // Debit increases balance, so add the difference (positive = more, negative = less)
        await client.query(
          `UPDATE customer_balance 
           SET current_balance = current_balance + $1,
               total_debit = total_debit + $1,
               last_updated = CURRENT_TIMESTAMP
           WHERE customer_id = $2`,
          [difference, oldNote.customer_id]
        );
      }

      // Update items if provided
      if (items && items.length > 0) {
        await client.query(
          `DELETE FROM debit_note_items WHERE customer_debit_note_id = $1`,
          [debitNoteId]
        );
        
        for (const item of items) {
          await client.query(
            `INSERT INTO debit_note_items 
             (customer_debit_note_id, product_id, product_name, quantity, unit_price, amount)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [debitNoteId, item.product_id, item.product_name || null, item.quantity, item.unit_price, item.amount]
          );
        }
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * ============================================
   * CUSTOMER CREDIT NOTES
   * ============================================
   * Credit Note to Customer: DECREASES what customer owes us
   */

  // Create customer credit note
  createCustomerCreditNote: async (creditNote, db = pool) => {
    const {
      customer_id,
      credit_note_number,
      billing_id,
      reason,
      amount,
      description,
      created_by,
      items = [],
    } = creditNote;

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Create credit note
      const result = await client.query(
        `INSERT INTO customer_credit_notes 
         (customer_id, credit_note_number, billing_id, reason, amount, description, created_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         RETURNING *`,
        [customer_id, credit_note_number, billing_id, reason, amount, description, created_by]
      );

      const creditNoteRecord = result.rows[0];

      // Create credit note items if provided (inventory update happens on approval)
      if (items && items.length > 0) {
        for (const item of items) {
          // Parse values to ensure they are numbers
          const productId = item.product_id ? parseInt(item.product_id) : null;
          const quantity = parseInt(item.quantity) || 0;
          const unitPrice = parseFloat(item.unit_price) || 0;
          const itemAmount = parseFloat(item.amount) || 0;

          await client.query(
            `INSERT INTO credit_note_items 
             (customer_credit_note_id, product_id, product_name, quantity, unit_price, amount)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [creditNoteRecord.id, productId, item.product_name || null, quantity, unitPrice, itemAmount]
          );
        }
      }

      // Note: Inventory and balance updates happen on APPROVAL, not creation

      await client.query('COMMIT');
      return creditNoteRecord;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Get customer credit notes
  getCustomerCreditNotes: async (customerId, db = pool) => {
    const result = await db.query(
      `SELECT ccn.*, b.invoice_number 
       FROM customer_credit_notes ccn
       LEFT JOIN billing b ON ccn.billing_id = b.id
       WHERE ccn.customer_id = $1 
       ORDER BY ccn.note_date DESC`,
      [customerId]
    );
    return result.rows;
  },

  // Get single customer credit note by ID
  getCustomerCreditNoteById: async (creditNoteId, db = pool) => {
    const result = await db.query(
      `SELECT ccn.*, b.invoice_number, c.name as customer_name
       FROM customer_credit_notes ccn
       LEFT JOIN billing b ON ccn.billing_id = b.id
       LEFT JOIN customers c ON ccn.customer_id = c.id
       WHERE ccn.id = $1`,
      [creditNoteId]
    );
    return result.rows[0];
  },

  // Approve customer credit note
  // When approved, update inventory and customer balance
  approveCustomerCreditNote: async (creditNoteId, db = pool) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Get credit note details
      const noteResult = await client.query(
        `SELECT * FROM customer_credit_notes WHERE id = $1`,
        [creditNoteId]
      );
      const note = noteResult.rows[0];

      if (!note) throw new Error('Credit note not found');
      if (note.status === 'approved') throw new Error('Credit note is already approved');
      if (note.status === 'cancelled') throw new Error('Cannot approve a cancelled credit note');

      // Reasons that should affect inventory (goods coming back to our stock from customer)
      const inventoryAffectingReasons = ['return', 'damaged goods', 'defective product', 'quality issue'];
      const shouldUpdateInventory = note.reason && inventoryAffectingReasons.includes(note.reason.trim().toLowerCase());

      // Get credit note items
      const itemsResult = await client.query(
        `SELECT * FROM credit_note_items WHERE customer_credit_note_id = $1`,
        [creditNoteId]
      );
      const items = itemsResult.rows;

      // INCREASE INVENTORY: When customer returns goods, add the quantity back to stock
      if (shouldUpdateInventory && items.length > 0) {
        for (const item of items) {
          if (item.product_id && item.quantity > 0) {
            console.log(`Approving Customer Credit Note - Increasing inventory for product ${item.product_id}: adding ${item.quantity} units (Reason: ${note.reason})`);
            await client.query(
              `UPDATE products 
               SET stock_quantity = stock_quantity + $1,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [item.quantity, item.product_id]
            );
          }
        }
      }

      // Update customer balance - Credit Note DECREASES customer's payable (they owe us less)
      await client.query(
        `UPDATE customer_balance 
         SET current_balance = current_balance - $1,
             total_credit = total_credit + $1,
             last_updated = CURRENT_TIMESTAMP
         WHERE customer_id = $2`,
        [note.amount, note.customer_id]
      );

      // Add entry to ledger
      await client.query(
        `INSERT INTO customer_ledger 
         (customer_id, billing_id, transaction_type, amount, description)
         VALUES ($1, $2, 'credit_note', $3, $4)`,
        [note.customer_id, note.billing_id, -note.amount, `Credit Note: ${note.credit_note_number} - ${note.reason}`]
      );

      // Update note status to approved
      const result = await client.query(
        `UPDATE customer_credit_notes 
         SET status = 'approved', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 
         RETURNING *`,
        [creditNoteId]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Cancel customer credit note
  cancelCustomerCreditNote: async (creditNoteId, db = pool) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Get credit note details
      const noteResult = await client.query(
        `SELECT * FROM customer_credit_notes WHERE id = $1`,
        [creditNoteId]
      );
      const note = noteResult.rows[0];

      if (!note) throw new Error('Credit note not found');
      if (note.status === 'cancelled') throw new Error('Credit note is already cancelled');

      // Only reverse inventory and balance if the note was approved (pending notes haven't affected anything yet)
      if (note.status === 'approved') {
        // Reasons that should affect inventory (goods coming back to our stock from customer)
        const inventoryAffectingReasons = ['return', 'damaged goods', 'defective product', 'quality issue'];
        const shouldReverseInventory = note.reason && inventoryAffectingReasons.includes(note.reason.trim().toLowerCase());

        // If it was an inventory-affecting reason, reverse the inventory update (subtract the items that were added back)
        if (shouldReverseInventory) {
          const itemsResult = await client.query(
            `SELECT * FROM credit_note_items WHERE customer_credit_note_id = $1`,
            [creditNoteId]
          );
          
          for (const item of itemsResult.rows) {
            if (item.product_id && item.quantity > 0) {
              console.log(`[Customer Credit Note Cancel] Reversing inventory for product ${item.product_id}: removing ${item.quantity} units`);
              await client.query(
                `UPDATE products 
                 SET stock_quantity = GREATEST(0, stock_quantity - $1),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [item.quantity, item.product_id]
              );
            }
          }
        }

        // Reverse the balance - Credit decreased balance, so add back to reverse
        await client.query(
          `UPDATE customer_balance 
           SET current_balance = current_balance + $1,
             total_credit = total_credit - $1,
             last_updated = CURRENT_TIMESTAMP
           WHERE customer_id = $2`,
          [note.amount, note.customer_id]
        );

        // Add reversal entry to ledger
        await client.query(
          `INSERT INTO customer_ledger 
           (customer_id, billing_id, transaction_type, amount, description)
           VALUES ($1, $2, 'cn_cancelled', $3, $4)`,
          [note.customer_id, note.billing_id, note.amount, `Credit Note Cancelled: ${note.credit_note_number}`]
        );
      }

      // Update note status
      const updated = await client.query(
        `UPDATE customer_credit_notes 
         SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 
         RETURNING *`,
        [creditNoteId]
      );

      await client.query('COMMIT');
      return updated.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Update customer credit note (for editing)
  updateCustomerCreditNote: async (creditNoteId, updates, db = pool) => {
    const { reason, amount, description, items } = updates;
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Get old credit note
      const oldNoteResult = await client.query(
        `SELECT * FROM customer_credit_notes WHERE id = $1`,
        [creditNoteId]
      );
      const oldNote = oldNoteResult.rows[0];

      if (!oldNote) throw new Error('Credit note not found');
      if (oldNote.status !== 'pending') throw new Error('Can only edit credit notes in pending status');

      // Check if reason is changing from/to Return
      const wasReturn = oldNote.reason && oldNote.reason.toLowerCase() === 'return';
      const isNowReturn = reason && reason.toLowerCase() === 'return';

      // Get old items for inventory reversal if needed
      const oldItemsResult = await client.query(
        `SELECT * FROM credit_note_items WHERE customer_credit_note_id = $1`,
        [creditNoteId]
      );
      const oldItems = oldItemsResult.rows;

      // If reason changed from Return to something else, reverse the inventory update
      if (wasReturn && !isNowReturn) {
        for (const item of oldItems) {
          if (item.product_id && item.quantity > 0) {
            await client.query(
              `UPDATE products 
               SET stock_quantity = GREATEST(0, stock_quantity - $1),
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [item.quantity, item.product_id]
            );
          }
        }
      }

      // Update note
      const result = await client.query(
        `UPDATE customer_credit_notes 
         SET reason = $1, amount = $2, description = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 
         RETURNING *`,
        [reason, amount, description, creditNoteId]
      );

      // If amount changed, update balance
      if (amount !== oldNote.amount) {
        const difference = amount - oldNote.amount;
        // Credit decreases balance, so subtract the difference
        await client.query(
          `UPDATE customer_balance 
           SET current_balance = current_balance - $1,
               total_credit = total_credit + $1,
               last_updated = CURRENT_TIMESTAMP
           WHERE customer_id = $2`,
          [difference, oldNote.customer_id]
        );
      }

      // Update items if provided
      if (items && items.length > 0) {
        // If was Return, reverse old inventory first
        if (wasReturn && isNowReturn) {
          for (const item of oldItems) {
            if (item.product_id && item.quantity > 0) {
              await client.query(
                `UPDATE products 
                 SET stock_quantity = GREATEST(0, stock_quantity - $1),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [item.quantity, item.product_id]
              );
            }
          }
        }

        await client.query(
          `DELETE FROM credit_note_items WHERE customer_credit_note_id = $1`,
          [creditNoteId]
        );
        
        for (const item of items) {
          const productId = item.product_id ? parseInt(item.product_id) : null;
          const quantity = parseInt(item.quantity) || 0;
          const unitPrice = parseFloat(item.unit_price) || 0;
          const itemAmount = parseFloat(item.amount) || 0;

          await client.query(
            `INSERT INTO credit_note_items 
             (customer_credit_note_id, product_id, product_name, quantity, unit_price, amount)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [creditNoteId, productId, item.product_name || null, quantity, unitPrice, itemAmount]
          );

          // If reason is now Return, add new inventory
          if (isNowReturn && productId && quantity > 0) {
            await client.query(
              `UPDATE products 
               SET stock_quantity = stock_quantity + $1,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [quantity, productId]
            );
          }
        }
      } else if (!wasReturn && isNowReturn) {
        // Reason changed to Return but items not updated, apply inventory to existing items
        for (const item of oldItems) {
          if (item.product_id && item.quantity > 0) {
            await client.query(
              `UPDATE products 
               SET stock_quantity = stock_quantity + $1,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [item.quantity, item.product_id]
            );
          }
        }
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * ============================================
   * VENDOR DEBIT NOTES
   * ============================================
   * Debit Note to Vendor: DECREASES what we owe vendor
   */

  // Create vendor debit note
  // When we raise a debit note against vendor (for returns/damaged goods),
  // we need to also decrease inventory and optionally adjust PO quantities
  createVendorDebitNote: async (debitNote, db = pool) => {
    const {
      vendor_id,
      debit_note_number,
      po_id,
      reason,
      amount,
      description,
      created_by,
      items = [],
    } = debitNote;

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Create debit note
      const result = await client.query(
        `INSERT INTO vendor_debit_notes 
         (vendor_id, debit_note_number, po_id, reason, amount, description, created_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         RETURNING *`,
        [vendor_id, debit_note_number, po_id, reason, amount, description, created_by]
      );

      const debitNoteRecord = result.rows[0];

      // Create debit note items if provided (inventory update happens on approval)
      if (items && items.length > 0) {
        console.log(`[Create Vendor Debit Note ${debitNoteRecord.id}] Adding ${items.length} item(s)`);
        for (const item of items) {
          // Parse values to ensure they are numbers
          const productId = item.product_id ? parseInt(item.product_id) : null;
          const quantity = parseInt(item.quantity) || 0;
          const unitPrice = parseFloat(item.unit_price) || 0;
          const itemAmount = parseFloat(item.amount) || 0;

          console.log(`[Create Vendor Debit Note ${debitNoteRecord.id}] Adding item: product_id=${productId}, product_name=${item.product_name}, quantity=${quantity}`);

          await client.query(
            `INSERT INTO debit_note_items 
             (vendor_debit_note_id, product_id, product_name, quantity, unit_price, amount)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [debitNoteRecord.id, productId, item.product_name || null, quantity, unitPrice, itemAmount]
          );
        }
      } else {
        console.log(`[Create Vendor Debit Note ${debitNoteRecord.id}] No items provided - inventory will NOT be updated on approval`);
      }

      // Note: Inventory, PO, and balance updates happen on APPROVAL, not creation

      await client.query('COMMIT');
      return debitNoteRecord;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Get vendor debit notes
  getVendorDebitNotes: async (vendorId, db = pool) => {
    const result = await db.query(
      `SELECT vdn.*, po.po_number 
       FROM vendor_debit_notes vdn
       LEFT JOIN purchase_orders po ON vdn.po_id = po.id
       WHERE vdn.vendor_id = $1 
       ORDER BY vdn.note_date DESC`,
      [vendorId]
    );
    return result.rows;
  },

  // Get single vendor debit note by ID
  getVendorDebitNoteById: async (debitNoteId, db = pool) => {
    const result = await db.query(
      `SELECT vdn.*, po.po_number, v.name as vendor_name
       FROM vendor_debit_notes vdn
       LEFT JOIN purchase_orders po ON vdn.po_id = po.id
       LEFT JOIN vendors v ON vdn.vendor_id = v.id
       WHERE vdn.id = $1`,
      [debitNoteId]
    );
    return result.rows[0];
  },

  // Approve vendor debit note
  // When approved, update inventory, PO quantities, and vendor balance
  approveVendorDebitNote: async (debitNoteId, db = pool) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Get debit note details
      const noteResult = await client.query(
        `SELECT * FROM vendor_debit_notes WHERE id = $1`,
        [debitNoteId]
      );
      const note = noteResult.rows[0];

      if (!note) throw new Error('Debit note not found');
      if (note.status === 'approved') throw new Error('Debit note is already approved');
      if (note.status === 'cancelled') throw new Error('Cannot approve a cancelled debit note');

      // Reasons that should affect inventory (goods leaving our stock)
      // Using flexible matching to handle variations in reason text
      const inventoryAffectingKeywords = ['return', 'damaged', 'defective', 'quality'];
      const reasonLower = note.reason ? note.reason.trim().toLowerCase() : '';
      const shouldUpdateInventory = inventoryAffectingKeywords.some(keyword => reasonLower.includes(keyword));
      
      console.log(`[Vendor Debit Note ${debitNoteId}] Reason: "${note.reason}", Normalized: "${reasonLower}", Should Update Inventory: ${shouldUpdateInventory}`);
      console.log(`[Vendor Debit Note ${debitNoteId}] Checking against keywords: ${inventoryAffectingKeywords.join(', ')}`);

      // Get debit note items
      const itemsResult = await client.query(
        `SELECT * FROM debit_note_items WHERE vendor_debit_note_id = $1`,
        [debitNoteId]
      );
      const items = itemsResult.rows;
      
      console.log(`[Vendor Debit Note ${debitNoteId}] Found ${items.length} item(s)`);
      
      // Debug: Log all items with their details
      for (const item of items) {
        console.log(`[Vendor Debit Note ${debitNoteId}] Item detail: id=${item.id}, product_id=${item.product_id}, product_name=${item.product_name}, quantity=${item.quantity}, vendor_debit_note_id=${item.vendor_debit_note_id}`);
      }

      // DECREASE INVENTORY: Only when returning goods to vendor or goods are damaged/defective
      if (shouldUpdateInventory) {
        if (items.length === 0) {
          console.log(`[Vendor Debit Note ${debitNoteId}] WARNING: No items found - inventory will NOT be updated. Add products to the debit note to update inventory.`);
        } else {
          for (const item of items) {
            console.log(`[Vendor Debit Note ${debitNoteId}] Processing item: product_id=${item.product_id}, product_name=${item.product_name}, quantity=${item.quantity}`);
            
            let productId = item.product_id;
            
            // If product_id is null, try to find product by name
            if (!productId && item.product_name) {
              console.log(`[Vendor Debit Note ${debitNoteId}] product_id is null, searching for product by name: "${item.product_name}"`);
              const productSearch = await client.query(
                `SELECT id, name, stock_quantity FROM products WHERE LOWER(name) = LOWER($1) LIMIT 1`,
                [item.product_name.trim()]
              );
              
              if (productSearch.rows.length > 0) {
                productId = productSearch.rows[0].id;
                console.log(`[Vendor Debit Note ${debitNoteId}] Found product by name: id=${productId}, name=${productSearch.rows[0].name}`);
              } else {
                console.log(`[Vendor Debit Note ${debitNoteId}] ERROR: Product "${item.product_name}" not found in products table by name. Cannot update inventory.`);
              }
            }
            
            if (productId && item.quantity > 0) {
              // Check if product exists
              const productCheck = await client.query(
                `SELECT id, name, stock_quantity FROM products WHERE id = $1`,
                [productId]
              );
              
              if (productCheck.rows.length === 0) {
                console.log(`[Vendor Debit Note ${debitNoteId}] ERROR: Product ${productId} not found in products table!`);
                continue;
              }
              
              const product = productCheck.rows[0];
              console.log(`[Vendor Debit Note ${debitNoteId}] Found product: id=${product.id}, name=${product.name}, current_stock=${product.stock_quantity}`);
              console.log(`[Vendor Debit Note ${debitNoteId}] Decreasing inventory for product ${productId}: removing ${item.quantity} units`);
              
              await client.query(
                `UPDATE products 
                 SET stock_quantity = GREATEST(0, stock_quantity - $1),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [item.quantity, productId]
              );
              
              // Get stock after update
              const afterStock = await client.query(
                `SELECT stock_quantity FROM products WHERE id = $1`,
                [productId]
              );
              const stockAfter = afterStock.rows[0]?.stock_quantity || 0;
              
              console.log(`[Vendor Debit Note ${debitNoteId}] Product ${productId} stock: ${product.stock_quantity} -> ${stockAfter}`);
            } else {
              if (!productId) {
                console.log(`[Vendor Debit Note ${debitNoteId}] Skipping item - product not found (product_id: ${item.product_id}, product_name: ${item.product_name})`);
              } else {
                console.log(`[Vendor Debit Note ${debitNoteId}] Skipping item - invalid quantity (product_id: ${productId}, quantity: ${item.quantity})`);
              }
            }

            // DECREASE PO ITEMS: If a PO is linked and inventory is affected, reduce the quantity in po_items
            if (note.po_id && productId && item.quantity > 0) {
              await client.query(
                `UPDATE po_items 
                 SET quantity = GREATEST(0, quantity - $1)
                 WHERE po_id = $2 AND product_id = $3`,
                [item.quantity, note.po_id, productId]
              );
              console.log(`[Vendor Debit Note ${debitNoteId}] Updated PO items for product ${productId}`);
            }
          }
        }
      } else {
        console.log(`[Vendor Debit Note ${debitNoteId}] Reason "${note.reason}" does not affect inventory`);
      }

      // Update PO total_amount if PO is linked
      if (note.po_id) {
        await client.query(
          `UPDATE purchase_orders 
           SET total_amount = GREATEST(0, total_amount - $1),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [note.amount, note.po_id]
        );
      }

      // Update vendor balance - Debit Note DECREASES what we owe vendor (vendor balance decreases)
      await client.query(
        `UPDATE vendor_balance 
         SET current_balance = current_balance - $1,
             total_debit = total_debit + $1,
             last_updated = CURRENT_TIMESTAMP
         WHERE vendor_id = $2`,
        [note.amount, note.vendor_id]
      );

      // Update note status to approved
      const result = await client.query(
        `UPDATE vendor_debit_notes 
         SET status = 'approved', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 
         RETURNING *`,
        [debitNoteId]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Cancel vendor debit note
  // When cancelling, we need to RESTORE inventory and PO quantities
  cancelVendorDebitNote: async (debitNoteId, db = pool) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Get debit note details
      const noteResult = await client.query(
        `SELECT * FROM vendor_debit_notes WHERE id = $1`,
        [debitNoteId]
      );
      const note = noteResult.rows[0];

      if (!note) throw new Error('Debit note not found');
      if (note.status === 'cancelled') throw new Error('Debit note is already cancelled');

      // Only reverse inventory and balance if the note was approved (pending notes haven't affected anything yet)
      if (note.status === 'approved') {
        // Reasons that should affect inventory (goods leaving our stock)
        // Using flexible matching to handle variations in reason text
        const inventoryAffectingKeywords = ['return', 'damaged', 'defective', 'quality'];
        const reasonLower = note.reason ? note.reason.trim().toLowerCase() : '';
        const shouldRestoreInventory = inventoryAffectingKeywords.some(keyword => reasonLower.includes(keyword));

        // Get debit note items to restore inventory and PO quantities
        const itemsResult = await client.query(
          `SELECT * FROM debit_note_items WHERE vendor_debit_note_id = $1`,
          [debitNoteId]
        );
        const items = itemsResult.rows;

        // RESTORE INVENTORY: Add back the quantities that were deducted (only if it was an inventory-affecting reason)
        if (shouldRestoreInventory) {
          for (const item of items) {
            let productId = item.product_id;
            
            // If product_id is null, try to find product by name
            if (!productId && item.product_name) {
              console.log(`[Vendor Debit Note Cancel] product_id is null, searching for product by name: "${item.product_name}"`);
              const productSearch = await client.query(
                `SELECT id FROM products WHERE LOWER(name) = LOWER($1) LIMIT 1`,
                [item.product_name.trim()]
              );
              
              if (productSearch.rows.length > 0) {
                productId = productSearch.rows[0].id;
                console.log(`[Vendor Debit Note Cancel] Found product by name: id=${productId}`);
              }
            }
            
            if (productId && item.quantity > 0) {
              console.log(`[Vendor Debit Note Cancel] Restoring inventory for product ${productId}: adding ${item.quantity} units`);
              await client.query(
                `UPDATE products 
                 SET stock_quantity = stock_quantity + $1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [item.quantity, productId]
              );
            }

            // RESTORE PO ITEMS: Add back quantities if PO was linked
            if (note.po_id && productId && item.quantity > 0) {
              await client.query(
                `UPDATE po_items 
                 SET quantity = quantity + $1
                 WHERE po_id = $2 AND product_id = $3`,
                [item.quantity, note.po_id, productId]
              );
            }
          }
        }

        // Restore PO total_amount if PO was linked
        if (note.po_id) {
          await client.query(
            `UPDATE purchase_orders 
             SET total_amount = total_amount + $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [note.amount, note.po_id]
          );
        }

        // Reverse the balance - Debit decreased our payable, so add back
        await client.query(
          `UPDATE vendor_balance 
           SET current_balance = current_balance + $1,
               total_debit = total_debit - $1,
               last_updated = CURRENT_TIMESTAMP
           WHERE vendor_id = $2`,
          [note.amount, note.vendor_id]
        );
      }

      // Update note status
      const updated = await client.query(
        `UPDATE vendor_debit_notes 
         SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 
         RETURNING *`,
        [debitNoteId]
      );

      await client.query('COMMIT');
      return updated.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Update vendor debit note (for editing)
  // When updating items, we need to adjust inventory accordingly
  updateVendorDebitNote: async (debitNoteId, updates, db = pool) => {
    const { reason, amount, description, items } = updates;
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Get old debit note
      const oldNoteResult = await client.query(
        `SELECT * FROM vendor_debit_notes WHERE id = $1`,
        [debitNoteId]
      );
      const oldNote = oldNoteResult.rows[0];

      if (!oldNote) throw new Error('Debit note not found');
      if (oldNote.status !== 'pending') throw new Error('Can only edit debit notes in pending status');

      // Get old items before deleting
      const oldItemsResult = await client.query(
        `SELECT * FROM debit_note_items WHERE vendor_debit_note_id = $1`,
        [debitNoteId]
      );
      const oldItems = oldItemsResult.rows;

      // Update note
      const result = await client.query(
        `UPDATE vendor_debit_notes 
         SET reason = $1, amount = $2, description = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 
         RETURNING *`,
        [reason || oldNote.reason, amount !== undefined ? amount : oldNote.amount, description || oldNote.description, debitNoteId]
      );

      // If amount changed, update balance and PO total
      if (amount !== undefined && amount !== parseFloat(oldNote.amount)) {
        const difference = amount - parseFloat(oldNote.amount);
        // Debit decreases what we owe, so subtract the difference
        await client.query(
          `UPDATE vendor_balance 
           SET current_balance = current_balance - $1,
               total_debit = total_debit + $1,
               last_updated = CURRENT_TIMESTAMP
           WHERE vendor_id = $2`,
          [difference, oldNote.vendor_id]
        );

        // Update PO total_amount if PO is linked
        if (oldNote.po_id) {
          await client.query(
            `UPDATE purchase_orders 
             SET total_amount = GREATEST(0, total_amount - $1),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [difference, oldNote.po_id]
          );
        }
      }

      // Update items if provided
      if (items && items.length > 0) {
        // STEP 1: Restore inventory from old items
        for (const oldItem of oldItems) {
          if (oldItem.product_id && oldItem.quantity > 0) {
            // Add back to inventory
            await client.query(
              `UPDATE products 
               SET stock_quantity = stock_quantity + $1,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [oldItem.quantity, oldItem.product_id]
            );

            // Add back to PO items if PO was linked
            if (oldNote.po_id) {
              await client.query(
                `UPDATE po_items 
                 SET quantity = quantity + $1
                 WHERE po_id = $2 AND product_id = $3`,
                [oldItem.quantity, oldNote.po_id, oldItem.product_id]
              );
            }
          }
        }

        // STEP 2: Delete old items
        await client.query(
          `DELETE FROM debit_note_items WHERE vendor_debit_note_id = $1`,
          [debitNoteId]
        );
        
        // STEP 3: Insert new items and decrease inventory
        for (const item of items) {
          // Parse values to ensure they are numbers
          const productId = item.product_id ? parseInt(item.product_id) : null;
          const quantity = parseInt(item.quantity) || 0;
          const unitPrice = parseFloat(item.unit_price) || 0;
          const itemAmount = parseFloat(item.amount) || 0;

          await client.query(
            `INSERT INTO debit_note_items 
             (vendor_debit_note_id, product_id, product_name, quantity, unit_price, amount)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [debitNoteId, productId, item.product_name || null, quantity, unitPrice, itemAmount]
          );

          // Decrease inventory for new items
          if (productId && quantity > 0) {
            await client.query(
              `UPDATE products 
               SET stock_quantity = GREATEST(0, stock_quantity - $1),
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [quantity, productId]
            );

            // Decrease PO items if PO is linked
            if (oldNote.po_id) {
              await client.query(
                `UPDATE po_items 
                 SET quantity = GREATEST(0, quantity - $1)
                 WHERE po_id = $2 AND product_id = $3`,
                [quantity, oldNote.po_id, productId]
              );
            }
          }
        }
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * ============================================
   * VENDOR CREDIT NOTES
   * ============================================
   * Credit Note from Vendor: INCREASES what we owe vendor
   */

  // Create vendor credit note
  createVendorCreditNote: async (creditNote, db = pool) => {
    const {
      vendor_id,
      credit_note_number,
      po_id,
      reason,
      amount,
      description,
      created_by,
      items = [],
    } = creditNote;

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Create credit note
      const result = await client.query(
        `INSERT INTO vendor_credit_notes 
         (vendor_id, credit_note_number, po_id, reason, amount, description, created_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         RETURNING *`,
        [vendor_id, credit_note_number, po_id, reason, amount, description, created_by]
      );

      const creditNoteRecord = result.rows[0];

      // Create credit note items if provided
      if (items && items.length > 0) {
        for (const item of items) {
          await client.query(
            `INSERT INTO credit_note_items 
             (vendor_credit_note_id, product_id, product_name, quantity, unit_price, amount)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [creditNoteRecord.id, item.product_id, item.product_name || null, item.quantity, item.unit_price, item.amount]
          );
        }
      }

      // Update vendor balance - Credit Note INCREASES what we owe vendor (vendor balance increases)
      await client.query(
        `UPDATE vendor_balance 
         SET current_balance = current_balance + $1,
             total_credit = total_credit + $1,
             last_updated = CURRENT_TIMESTAMP
         WHERE vendor_id = $2`,
        [amount, vendor_id]
      );

      await client.query('COMMIT');
      return creditNoteRecord;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Get vendor credit notes
  getVendorCreditNotes: async (vendorId, db = pool) => {
    const result = await db.query(
      `SELECT vcn.*, po.po_number 
       FROM vendor_credit_notes vcn
       LEFT JOIN purchase_orders po ON vcn.po_id = po.id
       WHERE vcn.vendor_id = $1 
       ORDER BY vcn.note_date DESC`,
      [vendorId]
    );
    return result.rows;
  },

  // Get single vendor credit note by ID
  getVendorCreditNoteById: async (creditNoteId, db = pool) => {
    const result = await db.query(
      `SELECT vcn.*, po.po_number, v.name as vendor_name
       FROM vendor_credit_notes vcn
       LEFT JOIN purchase_orders po ON vcn.po_id = po.id
       LEFT JOIN vendors v ON vcn.vendor_id = v.id
       WHERE vcn.id = $1`,
      [creditNoteId]
    );
    return result.rows[0];
  },

  // Approve vendor credit note
  approveVendorCreditNote: async (creditNoteId, db = pool) => {
    const result = await db.query(
      `UPDATE vendor_credit_notes 
       SET status = 'approved', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 
       RETURNING *`,
      [creditNoteId]
    );
    return result.rows[0];
  },

  // Cancel vendor credit note
  cancelVendorCreditNote: async (creditNoteId, db = pool) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Get credit note details
      const noteResult = await client.query(
        `SELECT * FROM vendor_credit_notes WHERE id = $1`,
        [creditNoteId]
      );
      const note = noteResult.rows[0];

      if (!note) throw new Error('Credit note not found');
      if (note.status === 'cancelled') throw new Error('Credit note is already cancelled');

      // Reverse the balance - Credit increased our payable, so subtract back
      await client.query(
        `UPDATE vendor_balance 
         SET current_balance = current_balance - $1,
             total_credit = total_credit - $1,
             last_updated = CURRENT_TIMESTAMP
         WHERE vendor_id = $2`,
        [note.amount, note.vendor_id]
      );

      // Update note status
      const updated = await client.query(
        `UPDATE vendor_credit_notes 
         SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 
         RETURNING *`,
        [creditNoteId]
      );

      await client.query('COMMIT');
      return updated.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Update vendor credit note (for editing)
  updateVendorCreditNote: async (creditNoteId, updates, db = pool) => {
    const { reason, amount, description, items } = updates;
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Get old credit note
      const oldNoteResult = await client.query(
        `SELECT * FROM vendor_credit_notes WHERE id = $1`,
        [creditNoteId]
      );
      const oldNote = oldNoteResult.rows[0];

      if (!oldNote) throw new Error('Credit note not found');
      if (oldNote.status !== 'pending') throw new Error('Can only edit credit notes in pending status');

      // Update note
      const result = await client.query(
        `UPDATE vendor_credit_notes 
         SET reason = $1, amount = $2, description = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 
         RETURNING *`,
        [reason, amount, description, creditNoteId]
      );

      // If amount changed, update balance
      if (amount !== oldNote.amount) {
        const difference = amount - oldNote.amount;
        // Credit increases what we owe, so add the difference
        await client.query(
          `UPDATE vendor_balance 
           SET current_balance = current_balance + $1,
               total_credit = total_credit + $1,
               last_updated = CURRENT_TIMESTAMP
           WHERE vendor_id = $2`,
          [difference, oldNote.vendor_id]
        );
      }

      // Update items if provided
      if (items && items.length > 0) {
        await client.query(
          `DELETE FROM credit_note_items WHERE vendor_credit_note_id = $1`,
          [creditNoteId]
        );
        
        for (const item of items) {
          await client.query(
            `INSERT INTO credit_note_items 
             (vendor_credit_note_id, product_id, product_name, quantity, unit_price, amount)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [creditNoteId, item.product_id, item.product_name || null, item.quantity, item.unit_price, item.amount]
          );
        }
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * ============================================
   * BALANCE TRACKING
   * ============================================
   */

  // Initialize customer balance
  initializeCustomerBalance: async (customerId, db = pool) => {
    const result = await db.query(
      `INSERT INTO customer_balance (customer_id, opening_balance, current_balance)
       VALUES ($1, 0, 0)
       ON CONFLICT (customer_id) DO NOTHING
       RETURNING *`,
      [customerId]
    );
    return result.rows[0];
  },

  // Get customer balance
  getCustomerBalance: async (customerId, db = pool) => {
    const result = await db.query(
      `SELECT * FROM customer_balance WHERE customer_id = $1`,
      [customerId]
    );
    return result.rows[0] || null;
  },

  // Initialize vendor balance
  initializeVendorBalance: async (vendorId, db = pool) => {
    const result = await db.query(
      `INSERT INTO vendor_balance (vendor_id, opening_balance, current_balance)
       VALUES ($1, 0, 0)
       ON CONFLICT (vendor_id) DO NOTHING
       RETURNING *`,
      [vendorId]
    );
    return result.rows[0];
  },

  // Get vendor balance
  getVendorBalance: async (vendorId, db = pool) => {
    const result = await db.query(
      `SELECT * FROM vendor_balance WHERE vendor_id = $1`,
      [vendorId]
    );
    return result.rows[0] || null;
  },

  // Generate customer debit/credit summary
  getCustomerSummary: async (customerId, db = pool) => {
    const balanceResult = await db.query(
      `SELECT * FROM customer_balance WHERE customer_id = $1`,
      [customerId]
    );

    const debitNotesResult = await db.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
       FROM customer_debit_notes 
       WHERE customer_id = $1 AND status != 'cancelled'`,
      [customerId]
    );

    const creditNotesResult = await db.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
       FROM customer_credit_notes 
       WHERE customer_id = $1 AND status != 'cancelled'`,
      [customerId]
    );

    return {
      balance: balanceResult.rows[0] || null,
      debitNotes: debitNotesResult.rows[0],
      creditNotes: creditNotesResult.rows[0],
    };
  },

  // Generate vendor debit/credit summary
  getVendorSummary: async (vendorId, db = pool) => {
    const balanceResult = await db.query(
      `SELECT * FROM vendor_balance WHERE vendor_id = $1`,
      [vendorId]
    );

    const debitNotesResult = await db.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
       FROM vendor_debit_notes 
       WHERE vendor_id = $1 AND status != 'cancelled'`,
      [vendorId]
    );

    const creditNotesResult = await db.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
       FROM vendor_credit_notes 
       WHERE vendor_id = $1 AND status != 'cancelled'`,
      [vendorId]
    );

    return {
      balance: balanceResult.rows[0] || null,
      debitNotes: debitNotesResult.rows[0],
      creditNotes: creditNotesResult.rows[0],
    };
  },

  /**
   * ============================================
   * DEBIT NOTE ITEMS (Product Details)
   * ============================================
   */

  // Create debit note items
  createDebitNoteItems: async (debitNoteId, items, isCustomer = true, db = pool) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const columnName = isCustomer ? 'customer_debit_note_id' : 'vendor_debit_note_id';
      
      for (const item of items) {
        await client.query(
          `INSERT INTO debit_note_items 
           (${columnName}, product_id, product_name, quantity, unit_price, amount)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [debitNoteId, item.product_id, item.product_name || null, item.quantity, item.unit_price, item.amount]
        );
      }

      await client.query('COMMIT');
      return items;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Get debit note items
  getDebitNoteItems: async (debitNoteId, isCustomer = true, db = pool) => {
    let query = `SELECT dni.*, p.name as product_name_from_db, p.sku
                 FROM debit_note_items dni
                 LEFT JOIN products p ON dni.product_id = p.id
                 WHERE dni.`;
    
    if (isCustomer) {
      query += `customer_debit_note_id = $1`;
    } else {
      query += `vendor_debit_note_id = $1`;
    }
    query += ` ORDER BY dni.created_at ASC`;
    
    const result = await db.query(query, [debitNoteId]);
    // Use stored product_name if available, otherwise fall back to product table
    return result.rows.map(row => ({
      ...row,
      product_name: row.product_name || row.product_name_from_db
    }));
  },

  // Delete debit note items
  deleteDebitNoteItems: async (debitNoteId, isCustomer = true, db = pool) => {
    const columnName = isCustomer ? 'customer_debit_note_id' : 'vendor_debit_note_id';
    await db.query(
      `DELETE FROM debit_note_items WHERE ${columnName} = $1`,
      [debitNoteId]
    );
  },

  /**
   * ============================================
   * CREDIT NOTE ITEMS
   * ============================================
   */

  // Create credit note items
  createCreditNoteItems: async (creditNoteId, items, isCustomer = true, db = pool) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const columnName = isCustomer ? 'customer_credit_note_id' : 'vendor_credit_note_id';
      
      for (const item of items) {
        await client.query(
          `INSERT INTO credit_note_items 
           (${columnName}, product_id, product_name, quantity, unit_price, amount)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [creditNoteId, item.product_id, item.product_name || null, item.quantity, item.unit_price, item.amount]
        );
      }

      await client.query('COMMIT');
      return items;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Get credit note items
  getCreditNoteItems: async (creditNoteId, isCustomer = true, db = pool) => {
    let query = `SELECT cni.*, p.name as product_name_from_db, p.sku
                 FROM credit_note_items cni
                 LEFT JOIN products p ON cni.product_id = p.id
                 WHERE cni.`;
    
    if (isCustomer) {
      query += `customer_credit_note_id = $1`;
    } else {
      query += `vendor_credit_note_id = $1`;
    }
    query += ` ORDER BY cni.created_at ASC`;
    
    const result = await db.query(query, [creditNoteId]);
    // Use stored product_name if available, otherwise fall back to product table
    return result.rows.map(row => ({
      ...row,
      product_name: row.product_name || row.product_name_from_db
    }));
  },

  // Delete credit note items
  deleteCreditNoteItems: async (creditNoteId, isCustomer = true, db = pool) => {
    const columnName = isCustomer ? 'customer_credit_note_id' : 'vendor_credit_note_id';
    await db.query(
      `DELETE FROM credit_note_items WHERE ${columnName} = $1`,
      [creditNoteId]
    );
  },

  /**
   * ============================================
   * ALL NOTES RETRIEVAL
   * ============================================
   */

  // Get all customer debit notes (for reports)
  getAllCustomerDebitNotes: async (db = pool) => {
    const result = await db.query(
      `SELECT cdn.*, c.name as customer_name, b.invoice_number
       FROM customer_debit_notes cdn
       LEFT JOIN customers c ON cdn.customer_id = c.id
       LEFT JOIN billing b ON cdn.billing_id = b.id
       ORDER BY cdn.note_date DESC`
    );
    return result.rows;
  },

  // Get all customer credit notes (for reports)
  getAllCustomerCreditNotes: async (db = pool) => {
    const result = await db.query(
      `SELECT ccn.*, c.name as customer_name, b.invoice_number
       FROM customer_credit_notes ccn
       LEFT JOIN customers c ON ccn.customer_id = c.id
       LEFT JOIN billing b ON ccn.billing_id = b.id
       ORDER BY ccn.note_date DESC`
    );
    return result.rows;
  },

  // Get all vendor debit notes (for reports)
  getAllVendorDebitNotes: async (db = pool) => {
    const result = await db.query(
      `SELECT vdn.*, v.name as vendor_name, po.po_number
       FROM vendor_debit_notes vdn
       LEFT JOIN vendors v ON vdn.vendor_id = v.id
       LEFT JOIN purchase_orders po ON vdn.po_id = po.id
       ORDER BY vdn.note_date DESC`
    );
    return result.rows;
  },

  // Get all vendor credit notes (for reports)
  getAllVendorCreditNotes: async (db = pool) => {
    const result = await db.query(
      `SELECT vcn.*, v.name as vendor_name, po.po_number
       FROM vendor_credit_notes vcn
       LEFT JOIN vendors v ON vcn.vendor_id = v.id
       LEFT JOIN purchase_orders po ON vcn.po_id = po.id
       ORDER BY vcn.note_date DESC`
    );
    return result.rows;
  },
};

module.exports = DebitCreditNote;
