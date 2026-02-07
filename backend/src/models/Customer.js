const pool = require('../config/database');

const Customer = {
  getAll: async (db = pool) => {
    const result = await db.query(`
      SELECT 
        c.*,
        COUNT(o.id) as total_orders,
        COUNT(b.id) as total_invoices,
        COALESCE(SUM(b.amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN b.status IN ('unpaid', 'partial') THEN b.amount ELSE 0 END), 0) as billing_due_amount,
        COALESCE(cb.current_balance, 0) as debit_credit_balance,
        COALESCE(SUM(CASE WHEN b.status IN ('unpaid', 'partial') THEN b.amount ELSE 0 END), 0) + COALESCE(cb.current_balance, 0) as due_amount
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      LEFT JOIN billing b ON c.id = b.customer_id
      LEFT JOIN customer_balance cb ON c.id = cb.customer_id
      GROUP BY c.id, cb.current_balance
      ORDER BY c.created_at DESC
    `);
    return result.rows;
  },

  getById: async (id, db = pool) => {
    const result = await db.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(DISTINCT b.id) as total_invoices,
        COALESCE(SUM(b.amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN b.status IN ('unpaid', 'partial') THEN b.amount ELSE 0 END), 0) as billing_due_amount,
        COALESCE(SUM(CASE WHEN b.status = 'paid' THEN b.amount ELSE 0 END), 0) as paid_amount,
        COALESCE(cb.current_balance, 0) as debit_credit_balance,
        COALESCE(SUM(CASE WHEN b.status IN ('unpaid', 'partial') THEN b.amount ELSE 0 END), 0) + COALESCE(cb.current_balance, 0) as due_amount
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      LEFT JOIN billing b ON c.id = b.customer_id
      LEFT JOIN customer_balance cb ON c.id = cb.customer_id
      WHERE c.id = $1
      GROUP BY c.id, cb.current_balance
    `, [id]);
    return result.rows[0];
  },

  create: async (customer, db = pool) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const { name, email, phone, address, city, state, zip_code } = customer;
      const result = await client.query(
        'INSERT INTO customers (name, email, phone, address, city, state, zip_code) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [name, email, phone, address, city, state, zip_code]
      );
      
      const newCustomer = result.rows[0];

      // Initialize customer balance
      await client.query(
        `INSERT INTO customer_balance (customer_id, opening_balance, current_balance)
         VALUES ($1, 0, 0)`,
        [newCustomer.id]
      );

      await client.query('COMMIT');
      return newCustomer;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  update: async (id, customer, db = pool) => {
    const { name, email, phone, address, city, state, zip_code } = customer;
    const result = await db.query(
      'UPDATE customers SET name = $1, email = $2, phone = $3, address = $4, city = $5, state = $6, zip_code = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
      [name, email, phone, address, city, state, zip_code, id]
    );
    return result.rows[0];
  },

  delete: async (id, db = pool) => {
    await db.query('DELETE FROM customers WHERE id = $1', [id]);
  },

  // Get customer ledger
  getLedger: async (customerId, db = pool) => {
    const result = await db.query(
      `SELECT * FROM customer_ledger WHERE customer_id = $1 ORDER BY created_at DESC`,
      [customerId]
    );
    return result.rows;
  },

  // Add ledger entry
  addLedgerEntry: async (customerId, entry, db = pool) => {
    const { billing_id, transaction_type, amount, description } = entry;
    const result = await db.query(
      `INSERT INTO customer_ledger (customer_id, billing_id, transaction_type, amount, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [customerId, billing_id, transaction_type, amount, description]
    );
    return result.rows[0];
  },

  // Get outstanding balance
  getOutstandingBalance: async (customerId, db = pool) => {
    const result = await db.query(`
      SELECT COALESCE(SUM(CASE WHEN b.status = 'unpaid' THEN b.amount ELSE 0 END), 0) as outstanding
      FROM billing b
      WHERE b.customer_id = $1
    `, [customerId]);
    return result.rows[0].outstanding || 0;
  },

  // Get customer with detailed financial summary
  getDetailedSummary: async (customerId, db = pool) => {
    const customer = await this.getById(customerId, db);
    if (!customer) return null;

    const ledger = await this.getLedger(customerId, db);
    const outstanding = await this.getOutstandingBalance(customerId, db);

    return {
      ...customer,
      ledger,
      outstanding,
    };
  },

  // Get customer balance (debit/credit)
  getBalance: async (customerId, db = pool) => {
    const result = await db.query(
      `SELECT * FROM customer_balance WHERE customer_id = $1`,
      [customerId]
    );
    return result.rows[0] || null;
  },

  // Update customer opening balance
  updateOpeningBalance: async (customerId, openingBalance, db = pool) => {
    const result = await db.query(
      `UPDATE customer_balance 
       SET opening_balance = $1, current_balance = $1, last_updated = CURRENT_TIMESTAMP
       WHERE customer_id = $2 
       RETURNING *`,
      [openingBalance, customerId]
    );
    return result.rows[0];
  },

  // Get customer debit/credit summary with all notes
  getDebitCreditSummary: async (customerId, db = pool) => {
    const customer = await this.getById(customerId, db);
    if (!customer) return null;

    const balanceResult = await db.query(
      `SELECT * FROM customer_balance WHERE customer_id = $1`,
      [customerId]
    );

    const debitNotesResult = await db.query(
      `SELECT id, debit_note_number, amount, reason, status, note_date 
       FROM customer_debit_notes 
       WHERE customer_id = $1 
       ORDER BY note_date DESC`,
      [customerId]
    );

    const creditNotesResult = await db.query(
      `SELECT id, credit_note_number, amount, reason, status, note_date 
       FROM customer_credit_notes 
       WHERE customer_id = $1 
       ORDER BY note_date DESC`,
      [customerId]
    );

    const balance = balanceResult.rows[0] || {
      customer_id: customerId,
      opening_balance: 0,
      current_balance: 0,
      total_debit: 0,
      total_credit: 0,
    };

    return {
      customer,
      balance,
      debitNotes: debitNotesResult.rows,
      creditNotes: creditNotesResult.rows,
      summary: {
        totalDebits: debitNotesResult.rows.reduce((sum, note) => sum + parseFloat(note.amount || 0), 0),
        totalCredits: creditNotesResult.rows.reduce((sum, note) => sum + parseFloat(note.amount || 0), 0),
        netBalance: balance.current_balance,
      },
    };
  },
};

module.exports = Customer;
