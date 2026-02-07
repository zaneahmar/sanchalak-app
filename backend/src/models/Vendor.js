const pool = require('../config/database');

const Vendor = {
  getAll: async (db = pool) => {
    const result = await db.query(`
      SELECT 
        v.*,
        COUNT(DISTINCT po.id) as total_pos,
        COALESCE(SUM(po.total_amount), 0) as total_ordered,
        COALESCE(SUM(CASE WHEN po.status != 'cancelled' THEN po.total_amount ELSE 0 END), 0) as billing_pending_amount,
        COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as total_paid,
        COALESCE(vb.current_balance, 0) as debit_credit_balance,
        (
          COALESCE(SUM(CASE WHEN po.status != 'cancelled' THEN po.total_amount ELSE 0 END), 0) 
          - COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0)
        ) as pending_amount
      FROM vendors v
      LEFT JOIN purchase_orders po ON v.id = po.vendor_id
      LEFT JOIN payments p ON po.id = p.po_id
      LEFT JOIN vendor_balance vb ON v.id = vb.vendor_id
      GROUP BY v.id, vb.current_balance
      ORDER BY v.created_at DESC
    `);
    return result.rows;
  },

  getById: async (id, db = pool) => {
    const result = await db.query(`
      SELECT 
        v.*,
        COUNT(DISTINCT po.id) as total_pos,
        COALESCE(SUM(po.total_amount), 0) as total_ordered,
        COALESCE(SUM(CASE WHEN po.status != 'cancelled' THEN po.total_amount ELSE 0 END), 0) as billing_pending_amount,
        COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as total_paid,
        COALESCE(vb.current_balance, 0) as debit_credit_balance,
        (
          COALESCE(SUM(CASE WHEN po.status != 'cancelled' THEN po.total_amount ELSE 0 END), 0) 
          - COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0)
        ) as pending_amount
      FROM vendors v
      LEFT JOIN purchase_orders po ON v.id = po.vendor_id
      LEFT JOIN payments p ON po.id = p.po_id
      LEFT JOIN vendor_balance vb ON v.id = vb.vendor_id
      WHERE v.id = $1
      GROUP BY v.id, vb.current_balance
    `, [id]);
    return result.rows[0];
  },

  create: async (vendor, db = pool) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const { name, email, phone, address, city, state, zip_code, tax_id, bank_account, gstin } = vendor;
      const result = await client.query(
        `INSERT INTO vendors (name, email, phone, address, city, state, zip_code, tax_id, bank_account, gstin) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [name, email, phone, address, city, state, zip_code, tax_id, bank_account, gstin]
      );
      
      const newVendor = result.rows[0];

      // Initialize vendor balance
      await client.query(
        `INSERT INTO vendor_balance (vendor_id, opening_balance, current_balance)
         VALUES ($1, 0, 0)`,
        [newVendor.id]
      );

      await client.query('COMMIT');
      return newVendor;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  update: async (id, vendor, db = pool) => {
    const { name, email, phone, address, city, state, zip_code, tax_id, bank_account, gstin } = vendor;
    const result = await db.query(
      `UPDATE vendors SET name = $1, email = $2, phone = $3, address = $4, city = $5, state = $6, zip_code = $7, 
       tax_id = $8, bank_account = $9, gstin = $10, updated_at = CURRENT_TIMESTAMP WHERE id = $11 RETURNING *`,
      [name, email, phone, address, city, state, zip_code, tax_id, bank_account, gstin, id]
    );
    return result.rows[0];
  },

  delete: async (id, db = pool) => {
    await db.query('DELETE FROM vendors WHERE id = $1', [id]);
  },

  // Get vendor balance (debit/credit)
  getBalance: async (vendorId, db = pool) => {
    const result = await db.query(
      `SELECT * FROM vendor_balance WHERE vendor_id = $1`,
      [vendorId]
    );
    return result.rows[0] || null;
  },

  // Update vendor opening balance
  updateOpeningBalance: async (vendorId, openingBalance, db = pool) => {
    const result = await db.query(
      `UPDATE vendor_balance 
       SET opening_balance = $1, current_balance = $1, last_updated = CURRENT_TIMESTAMP
       WHERE vendor_id = $2 
       RETURNING *`,
      [openingBalance, vendorId]
    );
    return result.rows[0];
  },

  // Get vendor debit/credit summary with all notes
  getDebitCreditSummary: async (vendorId, db = pool) => {
    const vendor = await this.getById(vendorId, db);
    if (!vendor) return null;

    const balanceResult = await db.query(
      `SELECT * FROM vendor_balance WHERE vendor_id = $1`,
      [vendorId]
    );

    const debitNotesResult = await db.query(
      `SELECT id, debit_note_number, amount, reason, status, note_date 
       FROM vendor_debit_notes 
       WHERE vendor_id = $1 
       ORDER BY note_date DESC`,
      [vendorId]
    );

    const creditNotesResult = await db.query(
      `SELECT id, credit_note_number, amount, reason, status, note_date 
       FROM vendor_credit_notes 
       WHERE vendor_id = $1 
       ORDER BY note_date DESC`,
      [vendorId]
    );

    // Get purchase orders and their payment status
    const posResult = await db.query(`
      SELECT 
        po.id,
        po.po_number,
        po.total_amount,
        po.status,
        po.created_at,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        (po.total_amount - COALESCE(SUM(p.amount), 0)) as pending_amount
      FROM purchase_orders po
      LEFT JOIN payments p ON po.id = p.po_id AND p.status = 'completed'
      WHERE po.vendor_id = $1
      GROUP BY po.id
      ORDER BY po.created_at DESC
    `, [vendorId]);

    const balance = balanceResult.rows[0] || {
      vendor_id: vendorId,
      opening_balance: 0,
      current_balance: 0,
      total_debit: 0,
      total_credit: 0,
    };

    const totalDebits = debitNotesResult.rows.reduce((sum, note) => sum + parseFloat(note.amount || 0), 0);
    const totalCredits = creditNotesResult.rows.reduce((sum, note) => sum + parseFloat(note.amount || 0), 0);
    const totalPoAmount = posResult.rows.reduce((sum, po) => sum + parseFloat(po.total_amount || 0), 0);
    const totalPaidAmount = posResult.rows.reduce((sum, po) => sum + parseFloat(po.paid_amount || 0), 0);
    const totalPendingAmount = posResult.rows.reduce((sum, po) => sum + parseFloat(po.pending_amount || 0), 0);

    return {
      vendor,
      balance,
      debitNotes: debitNotesResult.rows,
      creditNotes: creditNotesResult.rows,
      purchaseOrders: posResult.rows,
      summary: {
        totalDebits,
        totalCredits,
        netBalance: balance.current_balance,
        totalPoAmount,
        totalPaidAmount,
        totalPendingAmount,
        totalDues: totalPendingAmount,
      },
    };
  },

  // Get vendor payment history
  getPaymentHistory: async (vendorId, db = pool) => {
    const result = await db.query(`
      SELECT 
        p.id,
        p.amount,
        p.payment_method,
        p.reference_number,
        p.status,
        p.created_at,
        po.po_number,
        po.total_amount as po_total
      FROM payments p
      LEFT JOIN purchase_orders po ON p.po_id = po.id
      WHERE po.vendor_id = $1
      ORDER BY p.created_at DESC
    `, [vendorId]);
    return result.rows;
  },

  // Get all vendors with their dues
  getAllWithDues: async (db = pool) => {
    const result = await db.query(`
      SELECT 
        v.id,
        v.name,
        v.email,
        v.phone,
        COUNT(DISTINCT po.id) as total_pos,
        COALESCE(SUM(po.total_amount), 0) as total_ordered,
        COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(po.total_amount) - COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0), 0) as pending_dues
      FROM vendors v
      LEFT JOIN purchase_orders po ON v.id = po.vendor_id
      LEFT JOIN payments p ON po.id = p.po_id
      GROUP BY v.id, v.name, v.email, v.phone
      HAVING COALESCE(SUM(po.total_amount) - COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0), 0) > 0
      ORDER BY pending_dues DESC
    `);
    return result.rows;
  },
};

module.exports = Vendor;
