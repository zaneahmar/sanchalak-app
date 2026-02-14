const express = require('express');
const router = express.Router();
const DebitCreditNote = require('../models/DebitCreditNote');
const Customer = require('../models/Customer');
const tokenExpiry = require('../middleware/tokenExpiry');
const tenantAuth = require('../middleware/tenantAuth');

// Apply token expiry and tenant authentication to all routes
router.use(tokenExpiry);
router.use(tenantAuth);

/**
 * ============================================
 * INVOICE LOOKUP FOR DEBIT/CREDIT NOTES
 * ============================================
 */

// Get customer invoices/sales for debit/credit notes
router.get('/customer/:customerId/invoices', async (req, res) => {
  try {
    const { customerId } = req.params;
    const result = await req.tenantDb.query(
      `SELECT 
        b.id, 
        b.invoice_number, 
        b.created_at as invoice_date,
        b.amount as total_amount,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        b.amount - COALESCE(SUM(p.amount), 0) as due_amount,
        b.status
      FROM billing b
      LEFT JOIN payments p ON p.billing_id = b.id
      WHERE b.customer_id = $1 
      GROUP BY b.id, b.invoice_number, b.created_at, b.amount, b.status
      ORDER BY b.created_at DESC`,
      [customerId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get products sold to a specific customer (for debit/credit notes)
router.get('/customer/:customerId/products', async (req, res) => {
  try {
    const { customerId } = req.params;
    const result = await req.tenantDb.query(
      `SELECT DISTINCT ON (p.id)
        p.id,
        p.name,
        p.sku,
        p.hsn_code,
        si.unit_price as price
      FROM products p
      INNER JOIN sale_items si ON si.product_id = p.id
      INNER JOIN sales s ON s.id = si.sale_id
      INNER JOIN billing b ON b.sale_id = s.id
      WHERE b.customer_id = $1
      ORDER BY p.id, b.created_at DESC`,
      [customerId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get vendor purchase orders for debit/credit notes
router.get('/vendor/:vendorId/purchase-orders', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const result = await req.tenantDb.query(
      `SELECT 
        id, 
        po_number, 
        po_date,
        total_amount,
        status
      FROM purchase_orders 
      WHERE vendor_id = $1 
      ORDER BY po_date DESC`,
      [vendorId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get products purchased from a specific vendor (for debit/credit notes)
router.get('/vendor/:vendorId/products', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const result = await req.tenantDb.query(
      `SELECT DISTINCT ON (p.id)
        p.id,
        p.name,
        p.sku,
        p.hsn_code,
        poi.unit_price as price
      FROM products p
      INNER JOIN po_items poi ON poi.product_id = p.id
      INNER JOIN purchase_orders po ON po.id = poi.po_id
      WHERE po.vendor_id = $1
      ORDER BY p.id, po.po_date DESC`,
      [vendorId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get invoice details with line items
router.get('/invoice/:invoiceId/details', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    // Get invoice header with proper field aliases and payment calculation
    const invoiceResult = await req.tenantDb.query(
      `SELECT 
        b.id,
        b.invoice_number,
        b.sale_id,
        b.customer_id,
        b.created_at as invoice_date,
        b.amount as total_amount,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        b.amount - COALESCE(SUM(p.amount), 0) as due_amount,
        b.status,
        b.subtotal,
        b.gst_amount,
        b.gst_rate,
        b.due_date,
        b.paid_date,
        b.payment_method
      FROM billing b
      LEFT JOIN payments p ON p.billing_id = b.id
      WHERE b.id = $1
      GROUP BY b.id, b.invoice_number, b.sale_id, b.customer_id, b.created_at, 
               b.amount, b.status, b.subtotal, b.gst_amount, b.gst_rate, 
               b.due_date, b.paid_date, b.payment_method`,
      [invoiceId]
    );
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const invoice = invoiceResult.rows[0];
    let items = [];
    
    // Get invoice items through sale_id if it exists
    if (invoice.sale_id) {
      const itemsResult = await req.tenantDb.query(
        `SELECT 
          si.id,
          si.product_id,
          si.quantity,
          si.unit_price as price,
          p.name as product_name,
          p.hsn_code,
          (si.quantity * si.unit_price) as total
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = $1`,
        [invoice.sale_id]
      );
      items = itemsResult.rows;
    }
    
    res.json({
      invoice: invoice,
      items: items
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get purchase order details with line items
router.get('/purchase-order/:poId/details', async (req, res) => {
  try {
    const { poId } = req.params;
    
    // Get PO header
    const poResult = await req.tenantDb.query(
      `SELECT 
        id,
        po_number,
        vendor_id,
        po_date,
        expected_delivery,
        total_amount,
        status,
        paid_date,
        notes,
        created_at
      FROM purchase_orders
      WHERE id = $1`,
      [poId]
    );
    
    if (poResult.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    const po = poResult.rows[0];
    
    // Get PO items
    const itemsResult = await req.tenantDb.query(
      `SELECT 
        poi.id,
        poi.product_id,
        poi.product_name,
        poi.quantity,
        poi.unit_price as price,
        poi.size,
        poi.hsn_code,
        (poi.quantity * poi.unit_price) as total
      FROM po_items poi
      WHERE poi.po_id = $1`,
      [poId]
    );
    
    res.json({
      po: po,
      items: itemsResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ============================================
 * CUSTOMER DEBIT NOTES
 * ============================================
 * Debit Note to Customer: INCREASES what customer owes us
 * - Additional charges (packing, freight, late fee)
 * - Price increased after invoice
 * - Extra quantity delivered
 */

// Create customer debit note
router.post('/customer/debit-notes', async (req, res) => {
  try {
    const { customer_id, billing_id, reason, amount, description, created_by, items = [] } = req.body;

    if (!customer_id || !amount || !reason || !billing_id) {
      return res.status(400).json({ error: 'Customer ID, invoice/billing ID, amount, and reason are required' });
    }

    // Verify customer exists
    const customer = await Customer.getById(customer_id, req.tenantDb);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Verify invoice exists and belongs to customer
    const invoiceResult = await req.tenantDb.query(
      'SELECT * FROM billing WHERE id = $1 AND customer_id = $2',
      [billing_id, customer_id]
    );
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or does not belong to this customer' });
    }

    // Generate debit note number
    const debit_note_number = `DN-${Date.now()}`;

    const debitNote = await DebitCreditNote.createCustomerDebitNote({
      customer_id,
      debit_note_number,
      billing_id,
      reason,
      amount: parseFloat(amount),
      description,
      created_by: created_by || 'system',
      items,
    }, req.tenantDb);

    res.status(201).json(debitNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer debit notes
router.get('/customer/:customerId/debit-notes', async (req, res) => {
  try {
    const { customerId } = req.params;
    const debitNotes = await DebitCreditNote.getCustomerDebitNotes(customerId, req.tenantDb);
    res.json(debitNotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single customer debit note
router.get('/customer/debit-note/:debitNoteId', async (req, res) => {
  try {
    const { debitNoteId } = req.params;
    const debitNote = await DebitCreditNote.getCustomerDebitNoteById(debitNoteId, req.tenantDb);
    if (!debitNote) {
      return res.status(404).json({ error: 'Debit note not found' });
    }
    res.json(debitNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update customer debit note
router.put('/customer/debit-notes/:debitNoteId', async (req, res) => {
  try {
    const { debitNoteId } = req.params;
    const { reason, amount, description, items } = req.body;

    if (!reason || !amount) {
      return res.status(400).json({ error: 'Reason and amount are required' });
    }

    const updatedNote = await DebitCreditNote.updateCustomerDebitNote(debitNoteId, {
      reason,
      amount: parseFloat(amount),
      description,
      items,
    }, req.tenantDb);

    res.json(updatedNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve customer debit note
router.put('/customer/debit-notes/:debitNoteId/approve', async (req, res) => {
  try {
    const { debitNoteId } = req.params;
    const debitNote = await DebitCreditNote.approveCustomerDebitNote(debitNoteId, req.tenantDb);
    if (!debitNote) {
      return res.status(404).json({ error: 'Debit note not found' });
    }
    res.json(debitNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel customer debit note
router.put('/customer/debit-notes/:debitNoteId/cancel', async (req, res) => {
  try {
    const { debitNoteId } = req.params;
    const debitNote = await DebitCreditNote.cancelCustomerDebitNote(debitNoteId, req.tenantDb);
    if (!debitNote) {
      return res.status(404).json({ error: 'Debit note not found' });
    }
    res.json(debitNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ============================================
 * CUSTOMER CREDIT NOTES
 * ============================================
 * Credit Note to Customer: DECREASES what customer owes us
 * - Sales return
 * - Overcharged in invoice
 * - Discount given after invoice
 * - Damaged goods accepted back
 */

// Create customer credit note
router.post('/customer/credit-notes', async (req, res) => {
  try {
    const { customer_id, billing_id, reason, amount, description, created_by, items = [] } = req.body;

    if (!customer_id || !amount || !reason || !billing_id) {
      return res.status(400).json({ error: 'Customer ID, invoice/billing ID, amount, and reason are required' });
    }

    // Verify customer exists
    const customer = await Customer.getById(customer_id, req.tenantDb);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Verify invoice exists and belongs to customer
    const invoiceResult = await req.tenantDb.query(
      'SELECT * FROM billing WHERE id = $1 AND customer_id = $2',
      [billing_id, customer_id]
    );
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or does not belong to this customer' });
    }

    // Generate credit note number
    const credit_note_number = `CN-${Date.now()}`;

    const creditNote = await DebitCreditNote.createCustomerCreditNote({
      customer_id,
      credit_note_number,
      billing_id,
      reason,
      amount: parseFloat(amount),
      description,
      created_by: created_by || 'system',
      items,
    }, req.tenantDb);

    res.status(201).json(creditNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer credit notes
router.get('/customer/:customerId/credit-notes', async (req, res) => {
  try {
    const { customerId } = req.params;
    const creditNotes = await DebitCreditNote.getCustomerCreditNotes(customerId, req.tenantDb);
    res.json(creditNotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single customer credit note
router.get('/customer/credit-note/:creditNoteId', async (req, res) => {
  try {
    const { creditNoteId } = req.params;
    const creditNote = await DebitCreditNote.getCustomerCreditNoteById(creditNoteId, req.tenantDb);
    if (!creditNote) {
      return res.status(404).json({ error: 'Credit note not found' });
    }
    res.json(creditNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update customer credit note
router.put('/customer/credit-notes/:creditNoteId', async (req, res) => {
  try {
    const { creditNoteId } = req.params;
    const { reason, amount, description, items } = req.body;

    if (!reason || !amount) {
      return res.status(400).json({ error: 'Reason and amount are required' });
    }

    const updatedNote = await DebitCreditNote.updateCustomerCreditNote(creditNoteId, {
      reason,
      amount: parseFloat(amount),
      description,
      items,
    }, req.tenantDb);

    res.json(updatedNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve customer credit note
router.put('/customer/credit-notes/:creditNoteId/approve', async (req, res) => {
  try {
    const { creditNoteId } = req.params;
    const creditNote = await DebitCreditNote.approveCustomerCreditNote(creditNoteId, req.tenantDb);
    if (!creditNote) {
      return res.status(404).json({ error: 'Credit note not found' });
    }
    res.json(creditNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel customer credit note
router.put('/customer/credit-notes/:creditNoteId/cancel', async (req, res) => {
  try {
    const { creditNoteId } = req.params;
    const creditNote = await DebitCreditNote.cancelCustomerCreditNote(creditNoteId, req.tenantDb);
    if (!creditNote) {
      return res.status(404).json({ error: 'Credit note not found' });
    }
    res.json(creditNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ============================================
 * CUSTOMER BALANCE MANAGEMENT
 * ============================================
 */

// Get customer balance
router.get('/customer/:customerId/balance', async (req, res) => {
  try {
    const { customerId } = req.params;
    const balance = await DebitCreditNote.getCustomerBalance(customerId, req.tenantDb);
    res.json(balance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update customer opening balance
router.put('/customer/:customerId/balance', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { opening_balance } = req.body;

    if (opening_balance === undefined || opening_balance === null) {
      return res.status(400).json({ error: 'Opening balance is required' });
    }

    const updatedBalance = await Customer.updateOpeningBalance(customerId, parseFloat(opening_balance), req.tenantDb);
    res.json(updatedBalance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer debit/credit summary
router.get('/customer/:customerId/debit-credit-summary', async (req, res) => {
  try {
    const { customerId } = req.params;
    const summary = await Customer.getDebitCreditSummary(customerId, req.tenantDb);
    if (!summary) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer overview with billing details linked to debit/credit notes
router.get('/customer/:customerId/overview', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    // Get balance
    const balance = await DebitCreditNote.getCustomerBalance(customerId, req.tenantDb);
    
    // Get debit notes with billing info (excluding cancelled)
    const debitNotesResult = await req.tenantDb.query(
      `SELECT cdn.*, b.invoice_number, b.sale_id, b.amount as billing_amount 
       FROM customer_debit_notes cdn
       LEFT JOIN billing b ON cdn.billing_id = b.id
       WHERE cdn.customer_id = $1
       ORDER BY cdn.created_at DESC`,
      [customerId]
    );
    
    // Get credit notes with billing info (excluding cancelled)
    const creditNotesResult = await req.tenantDb.query(
      `SELECT ccn.*, b.invoice_number, b.sale_id, b.amount as billing_amount 
       FROM customer_credit_notes ccn
       LEFT JOIN billing b ON ccn.billing_id = b.id
       WHERE ccn.customer_id = $1
       ORDER BY ccn.created_at DESC`,
      [customerId]
    );

    res.json({
      balance: balance || { current_balance: 0, total_debit: 0, total_credit: 0, opening_balance: 0 },
      debitNotes: debitNotesResult.rows,
      creditNotes: creditNotesResult.rows,
      summary: {
        totalDebits: (balance?.total_debit || 0),
        totalCredits: (balance?.total_credit || 0),
        currentBalance: (balance?.current_balance || 0),
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ============================================
 * VENDOR DEBIT NOTES
 * ============================================
 * Debit Note to Vendor: DECREASES what we owe vendor
 * - Purchase return
 * - Vendor overcharged
 * - Goods damaged
 * - Post-invoice discount
 */

// Create vendor debit note
router.post('/vendor/debit-notes', async (req, res) => {
  try {
    const { vendor_id, po_id, reason, amount, description, created_by, items = [] } = req.body;

    if (!vendor_id || !amount || !reason || !po_id) {
      return res.status(400).json({ error: 'Vendor ID, purchase order ID, amount, and reason are required' });
    }

    // Verify purchase order exists and belongs to vendor
    const poResult = await req.tenantDb.query(
      'SELECT * FROM purchase_orders WHERE id = $1 AND vendor_id = $2',
      [po_id, vendor_id]
    );
    
    if (poResult.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found or does not belong to this vendor' });
    }

    // Generate debit note number
    const debit_note_number = `VDN-${Date.now()}`;

    const debitNote = await DebitCreditNote.createVendorDebitNote({
      vendor_id,
      debit_note_number,
      po_id,
      reason,
      amount: parseFloat(amount),
      description,
      created_by: created_by || 'system',
      items,
    }, req.tenantDb);

    res.status(201).json(debitNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get vendor debit notes
router.get('/vendor/:vendorId/debit-notes', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const debitNotes = await DebitCreditNote.getVendorDebitNotes(vendorId, req.tenantDb);
    res.json(debitNotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single vendor debit note
router.get('/vendor/debit-note/:debitNoteId', async (req, res) => {
  try {
    const { debitNoteId } = req.params;
    const debitNote = await DebitCreditNote.getVendorDebitNoteById(debitNoteId, req.tenantDb);
    if (!debitNote) {
      return res.status(404).json({ error: 'Debit note not found' });
    }
    res.json(debitNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update vendor debit note
router.put('/vendor/debit-notes/:debitNoteId', async (req, res) => {
  try {
    const { debitNoteId } = req.params;
    const { reason, amount, description, items } = req.body;

    if (!reason || !amount) {
      return res.status(400).json({ error: 'Reason and amount are required' });
    }

    const updatedNote = await DebitCreditNote.updateVendorDebitNote(debitNoteId, {
      reason,
      amount: parseFloat(amount),
      description,
      items,
    }, req.tenantDb);

    res.json(updatedNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve vendor debit note
router.put('/vendor/debit-notes/:debitNoteId/approve', async (req, res) => {
  try {
    const { debitNoteId } = req.params;
    const debitNote = await DebitCreditNote.approveVendorDebitNote(debitNoteId, req.tenantDb);
    if (!debitNote) {
      return res.status(404).json({ error: 'Debit note not found' });
    }
    res.json(debitNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel vendor debit note
router.put('/vendor/debit-notes/:debitNoteId/cancel', async (req, res) => {
  try {
    const { debitNoteId } = req.params;
    const debitNote = await DebitCreditNote.cancelVendorDebitNote(debitNoteId, req.tenantDb);
    if (!debitNote) {
      return res.status(404).json({ error: 'Debit note not found' });
    }
    res.json(debitNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ============================================
 * VENDOR CREDIT NOTES
 * ============================================
 * Credit Note from Vendor: INCREASES what we owe vendor
 * - Additional charges from vendor
 * - Price revision upward
 * - Missed charges earlier
 */

// Create vendor credit note
router.post('/vendor/credit-notes', async (req, res) => {
  try {
    const { vendor_id, po_id, reason, amount, description, created_by, items = [] } = req.body;

    if (!vendor_id || !amount || !reason || !po_id) {
      return res.status(400).json({ error: 'Vendor ID, purchase order ID, amount, and reason are required' });
    }

    // Verify purchase order exists and belongs to vendor
    const poResult = await req.tenantDb.query(
      'SELECT * FROM purchase_orders WHERE id = $1 AND vendor_id = $2',
      [po_id, vendor_id]
    );
    
    if (poResult.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found or does not belong to this vendor' });
    }

    // Generate credit note number
    const credit_note_number = `VCN-${Date.now()}`;

    const creditNote = await DebitCreditNote.createVendorCreditNote({
      vendor_id,
      credit_note_number,
      po_id,
      reason,
      amount: parseFloat(amount),
      description,
      created_by: created_by || 'system',
      items,
    }, req.tenantDb);

    res.status(201).json(creditNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get vendor credit notes
router.get('/vendor/:vendorId/credit-notes', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const creditNotes = await DebitCreditNote.getVendorCreditNotes(vendorId, req.tenantDb);
    res.json(creditNotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single vendor credit note
router.get('/vendor/credit-note/:creditNoteId', async (req, res) => {
  try {
    const { creditNoteId } = req.params;
    const creditNote = await DebitCreditNote.getVendorCreditNoteById(creditNoteId, req.tenantDb);
    if (!creditNote) {
      return res.status(404).json({ error: 'Credit note not found' });
    }
    res.json(creditNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update vendor credit note
router.put('/vendor/credit-notes/:creditNoteId', async (req, res) => {
  try {
    const { creditNoteId } = req.params;
    const { reason, amount, description, items } = req.body;

    if (!reason || !amount) {
      return res.status(400).json({ error: 'Reason and amount are required' });
    }

    const updatedNote = await DebitCreditNote.updateVendorCreditNote(creditNoteId, {
      reason,
      amount: parseFloat(amount),
      description,
      items,
    }, req.tenantDb);

    res.json(updatedNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve vendor credit note
router.put('/vendor/credit-notes/:creditNoteId/approve', async (req, res) => {
  try {
    const { creditNoteId } = req.params;
    const creditNote = await DebitCreditNote.approveVendorCreditNote(creditNoteId, req.tenantDb);
    if (!creditNote) {
      return res.status(404).json({ error: 'Credit note not found' });
    }
    res.json(creditNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel vendor credit note
router.put('/vendor/credit-notes/:creditNoteId/cancel', async (req, res) => {
  try {
    const { creditNoteId } = req.params;
    const creditNote = await DebitCreditNote.cancelVendorCreditNote(creditNoteId, req.tenantDb);
    if (!creditNote) {
      return res.status(404).json({ error: 'Credit note not found' });
    }
    res.json(creditNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ============================================
 * VENDOR BALANCE MANAGEMENT
 * ============================================
 */

// Get vendor balance
router.get('/vendor/:vendorId/balance', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const balance = await DebitCreditNote.getVendorBalance(vendorId, req.tenantDb);
    res.json(balance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update vendor opening balance
router.put('/vendor/:vendorId/balance', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { opening_balance } = req.body;

    if (opening_balance === undefined || opening_balance === null) {
      return res.status(400).json({ error: 'Opening balance is required' });
    }

    const Vendor = require('../models/Vendor');
    const updatedBalance = await Vendor.updateOpeningBalance(vendorId, parseFloat(opening_balance), req.tenantDb);
    res.json(updatedBalance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get vendor debit/credit summary
router.get('/vendor/:vendorId/debit-credit-summary', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const Vendor = require('../models/Vendor');
    const summary = await Vendor.getDebitCreditSummary(vendorId, req.tenantDb);
    if (!summary) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get vendor overview with PO details linked to debit/credit notes
router.get('/vendor/:vendorId/overview', async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    // Get balance
    const balance = await DebitCreditNote.getVendorBalance(vendorId, req.tenantDb);
    
    // Get debit notes with PO info
    const debitNotesResult = await req.tenantDb.query(
      `SELECT vdn.*, po.po_number, po.total_amount as po_amount 
       FROM vendor_debit_notes vdn
       LEFT JOIN purchase_orders po ON vdn.po_id = po.id
       WHERE vdn.vendor_id = $1
       ORDER BY vdn.created_at DESC`,
      [vendorId]
    );
    
    // Get credit notes with PO info
    const creditNotesResult = await req.tenantDb.query(
      `SELECT vcn.*, po.po_number, po.total_amount as po_amount 
       FROM vendor_credit_notes vcn
       LEFT JOIN purchase_orders po ON vcn.po_id = po.id
       WHERE vcn.vendor_id = $1
       ORDER BY vcn.created_at DESC`,
      [vendorId]
    );

    res.json({
      balance: balance || { current_balance: 0, total_debit: 0, total_credit: 0, opening_balance: 0 },
      debitNotes: debitNotesResult.rows,
      creditNotes: creditNotesResult.rows,
      summary: {
        totalDebits: (balance?.total_debit || 0),
        totalCredits: (balance?.total_credit || 0),
        currentBalance: (balance?.current_balance || 0),
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ============================================
 * DEBIT NOTE ITEMS (Product Details)
 * ============================================
 */

// Get customer debit note items
router.get('/customer/debit-note/:debitNoteId/items', async (req, res) => {
  try {
    const { debitNoteId } = req.params;
    const items = await DebitCreditNote.getDebitNoteItems(debitNoteId, true, req.tenantDb);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get vendor debit note items
router.get('/vendor/debit-note/:debitNoteId/items', async (req, res) => {
  try {
    const { debitNoteId } = req.params;
    const items = await DebitCreditNote.getDebitNoteItems(debitNoteId, false, req.tenantDb);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ============================================
 * CREDIT NOTE ITEMS
 * ============================================
 */

// Get customer credit note items
router.get('/customer/credit-note/:creditNoteId/items', async (req, res) => {
  try {
    const { creditNoteId } = req.params;
    const items = await DebitCreditNote.getCreditNoteItems(creditNoteId, true, req.tenantDb);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get vendor credit note items
router.get('/vendor/credit-note/:creditNoteId/items', async (req, res) => {
  try {
    const { creditNoteId } = req.params;
    const items = await DebitCreditNote.getCreditNoteItems(creditNoteId, false, req.tenantDb);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ============================================
 * REPORTS - ALL NOTES
 * ============================================
 */

// Get all customer debit notes (for reports)
router.get('/reports/customer-debit-notes', async (req, res) => {
  try {
    const notes = await DebitCreditNote.getAllCustomerDebitNotes(req.tenantDb);
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all customer credit notes (for reports)
router.get('/reports/customer-credit-notes', async (req, res) => {
  try {
    const notes = await DebitCreditNote.getAllCustomerCreditNotes(req.tenantDb);
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all vendor debit notes (for reports)
router.get('/reports/vendor-debit-notes', async (req, res) => {
  try {
    const notes = await DebitCreditNote.getAllVendorDebitNotes(req.tenantDb);
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all vendor credit notes (for reports)
router.get('/reports/vendor-credit-notes', async (req, res) => {
  try {
    const notes = await DebitCreditNote.getAllVendorCreditNotes(req.tenantDb);
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
