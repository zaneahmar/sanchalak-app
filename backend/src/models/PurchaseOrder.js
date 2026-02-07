const pool = require('../config/database');

// Helper function to convert decimal strings to numbers
const convertToNumbers = (obj) => {
  if (!obj) return obj;
  return {
    ...obj,
    total_amount: parseFloat(obj.total_amount),
    quantity: obj.quantity ? parseInt(obj.quantity) : obj.quantity,
    unit_price: obj.unit_price ? parseFloat(obj.unit_price) : obj.unit_price,
  };
};

const PurchaseOrder = {
  getAll: async (db = pool) => {
    const result = await db.query(`
      SELECT 
        po.*,
        v.name as vendor_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', poi.id,
              'product_id', poi.product_id,
              'product_name', poi.product_name,
              'size', poi.size,
              'quantity', poi.quantity,
              'unit_price', poi.unit_price,
              'hsn_code', poi.hsn_code
            )
          ) FILTER (WHERE poi.id IS NOT NULL),
          '[]'::json
        ) as items
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN po_items poi ON po.id = poi.po_id
      GROUP BY po.id, v.id, v.name
      ORDER BY po.created_at DESC
    `);
    return result.rows.map(convertToNumbers);
  },

  getById: async (id, db = pool) => {
    const result = await db.query(`
      SELECT po.*, v.name as vendor_name, v.email as vendor_email, v.phone as vendor_phone
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      WHERE po.id = $1
    `, [id]);
    return convertToNumbers(result.rows[0]);
  },

  getPoItems: async (poId, db = pool) => {
    const result = await db.query(`
      SELECT poi.*, p.name as product_name_from_db
      FROM po_items poi
      LEFT JOIN products p ON poi.product_id = p.id
      WHERE poi.po_id = $1
    `, [poId]);
    return result.rows.map(convertToNumbers);
  },

  create: async (po, db = pool) => {
    const { po_number, vendor_id, total_amount, status, notes, expected_delivery } = po;
    const result = await db.query(
      `INSERT INTO purchase_orders (po_number, vendor_id, total_amount, status, notes, expected_delivery)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [po_number, vendor_id, total_amount, status || 'pending', notes, expected_delivery || null]
    );
    return convertToNumbers(result.rows[0]);
  },

  createPoItem: async (poItem, db = pool) => {
    const { po_id, product_id, product_name, size, quantity, unit_price, hsn_code } = poItem;
    const result = await db.query(
      `INSERT INTO po_items (po_id, product_id, product_name, size, quantity, unit_price, hsn_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [po_id, product_id || null, product_name, size, quantity, unit_price, hsn_code || null]
    );
    return convertToNumbers(result.rows[0]);
  },

  deletePoItems: async (poId, db = pool) => {
    await db.query('DELETE FROM po_items WHERE po_id = $1', [poId]);
  },

  update: async (id, po, db = pool) => {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Only add fields that are provided
    if (po.vendor_id !== undefined) {
      fields.push(`vendor_id = $${paramCount++}`);
      values.push(po.vendor_id);
    }
    if (po.total_amount !== undefined) {
      fields.push(`total_amount = $${paramCount++}`);
      values.push(po.total_amount);
    }
    if (po.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(po.status);
    }
    if (po.notes !== undefined) {
      fields.push(`notes = $${paramCount++}`);
      values.push(po.notes);
    }
    if (po.expected_delivery !== undefined) {
      fields.push(`expected_delivery = $${paramCount++}`);
      values.push(po.expected_delivery || null);
    }

    // Always update the timestamp
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Add ID for WHERE clause
    values.push(id);

    const query = `UPDATE purchase_orders SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, values);
    return convertToNumbers(result.rows[0]);
  },

  updateStatus: async (id, status, db = pool) => {
    const result = await db.query(
      `UPDATE purchase_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return convertToNumbers(result.rows[0]);
  },

  delete: async (id, db = pool) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Get PO to find vendor_id
      const poResult = await client.query(
        'SELECT vendor_id FROM purchase_orders WHERE id = $1',
        [id]
      );
      const po = poResult.rows[0];

      if (po) {
        // Find and delete associated debit note items
        const debitNoteResult = await client.query(
          `SELECT id FROM vendor_debit_notes WHERE debit_note_number = $1`,
          [`VDN-PO-${id}`]
        );

        if (debitNoteResult.rows.length > 0) {
          const debitNoteId = debitNoteResult.rows[0].id;
          
          // Delete debit note items
          await client.query(
            'DELETE FROM debit_note_items WHERE vendor_debit_note_id = $1',
            [debitNoteId]
          );

          // Delete the debit note
          await client.query(
            'DELETE FROM vendor_debit_notes WHERE id = $1',
            [debitNoteId]
          );

          // Reverse the vendor balance
          const noteBalanceResult = await client.query(
            `SELECT amount FROM vendor_debit_notes WHERE id = $1`,
            [debitNoteId]
          );
          
          if (noteBalanceResult.rows.length > 0) {
            const amount = noteBalanceResult.rows[0].amount;
            await client.query(
              `UPDATE vendor_balance 
               SET current_balance = current_balance + $1,
                   total_debit = total_debit - $1,
                   last_updated = CURRENT_TIMESTAMP
               WHERE vendor_id = $2`,
              [amount, po.vendor_id]
            );
          }
        }
      }

      // Delete PO items
      await client.query('DELETE FROM po_items WHERE po_id = $1', [id]);

      // Delete PO
      await client.query('DELETE FROM purchase_orders WHERE id = $1', [id]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  getByStatus: async (status, db = pool) => {
    const result = await db.query(`
      SELECT po.*, v.name as vendor_name
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      WHERE po.status = $1
      ORDER BY po.created_at DESC
    `, [status]);
    return result.rows.map(convertToNumbers);
  },

  getDropdownProducts: async (db = pool) => {
    const result = await db.query(`
      SELECT DISTINCT
        poi.product_name,
        poi.size,
        poi.unit_price,
        poi.quantity,
        poi.hsn_code
      FROM po_items poi
      WHERE poi.product_name IS NOT NULL
      ORDER BY poi.product_name ASC
    `);
    return result.rows;
  }
};

module.exports = PurchaseOrder;