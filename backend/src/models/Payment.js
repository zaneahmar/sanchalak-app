const pool = require('../config/database');

const Payment = {
  getAll: async (db = pool) => {
    const result = await db.query(`
      SELECT 
        p.*,
        b.invoice_number,
        b.amount as invoice_amount,
        c.name as customer_name,
        c.id as customer_id,
        po.po_number,
        v.name as vendor_name,
        COALESCE((b.amount - COALESCE((SELECT SUM(amount) FROM payments WHERE billing_id = b.id AND status = 'completed'), 0)), 0) as pending_amount
      FROM payments p
      LEFT JOIN billing b ON p.billing_id = b.id
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN purchase_orders po ON p.po_id = po.id
      LEFT JOIN vendors v ON po.vendor_id = v.id
      ORDER BY p.created_at DESC
    `);
    return result.rows;
  },

  getById: async (id, db = pool) => {
    const result = await db.query(`
      SELECT 
        p.*, 
        b.invoice_number, 
        b.amount as invoice_amount,
        c.name as customer_name,
        c.id as customer_id,
        po.po_number,
        v.name as vendor_name
      FROM payments p
      LEFT JOIN billing b ON p.billing_id = b.id
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN purchase_orders po ON p.po_id = po.id
      LEFT JOIN vendors v ON po.vendor_id = v.id
      WHERE p.id = $1
    `, [id]);
    return result.rows[0];
  },

  create: async (payment, db = pool) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      const { billing_id, po_id, amount, payment_method, reference_number, notes, status } = payment;
      const result = await client.query(
        `INSERT INTO payments (billing_id, po_id, amount, payment_method, reference_number, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [billing_id, po_id, amount, payment_method, reference_number, notes, status || 'completed']
      );

      const newPayment = result.rows[0];

      // Update billing status if it's a customer payment
      if (billing_id) {
        // Check if billing is fully paid
        const billingResult = await client.query(
          `SELECT b.amount, COALESCE(SUM(p.amount), 0) as paid_amount 
           FROM billing b
           LEFT JOIN payments p ON b.id = p.billing_id AND p.status = 'completed'
           WHERE b.id = $1
           GROUP BY b.id, b.amount`,
          [billing_id]
        );

        const billing = billingResult.rows[0];
        // paid_amount already includes the new payment (since it was inserted before this query)
        if (billing && parseFloat(billing.paid_amount) >= parseFloat(billing.amount)) {
          await client.query(
            `UPDATE billing SET status = 'paid', paid_date = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [billing_id]
          );
        } else if (amount > 0) {
          await client.query(
            `UPDATE billing SET status = 'partial' 
             WHERE id = $1`,
            [billing_id]
          );
        }
      }

      // Update PO status if it's a vendor payment
      if (po_id) {
        // Check if PO is fully paid
        const poResult = await client.query(
          `SELECT po.total_amount, COALESCE(SUM(p.amount), 0) as paid_amount 
           FROM purchase_orders po
           LEFT JOIN payments p ON po.id = p.po_id AND p.status = 'completed'
           WHERE po.id = $1
           GROUP BY po.id, po.total_amount`,
          [po_id]
        );

        const po = poResult.rows[0];
        // paid_amount already includes the new payment (since it was inserted before this query)
        if (po && parseFloat(po.paid_amount) >= parseFloat(po.total_amount)) {
          await client.query(
            `UPDATE purchase_orders SET status = 'paid', paid_date = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [po_id]
          );
        } else if (amount > 0) {
          await client.query(
            `UPDATE purchase_orders SET status = 'partial' 
             WHERE id = $1`,
            [po_id]
          );
        }
      }

      await client.query('COMMIT');
      return newPayment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  getByBillingId: async (billingId, db = pool) => {
    const result = await db.query(
      `SELECT * FROM payments WHERE billing_id = $1 ORDER BY created_at DESC`,
      [billingId]
    );
    return result.rows;
  },

  getByPoId: async (poId, db = pool) => {
    const result = await db.query(
      `SELECT * FROM payments WHERE po_id = $1 ORDER BY created_at DESC`,
      [poId]
    );
    return result.rows;
  },

  update: async (id, payment, db = pool) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const { amount, payment_method, reference_number, notes, status } = payment;
      const result = await client.query(
        `UPDATE payments 
         SET amount = $1, payment_method = $2, reference_number = $3, notes = $4, status = $5
         WHERE id = $6 RETURNING *`,
        [amount, payment_method, reference_number, notes, status, id]
      );

      const updatedPayment = result.rows[0];

      // Update billing status if needed
      if (updatedPayment.billing_id) {
        const billingResult = await client.query(
          `SELECT b.amount, COALESCE(SUM(p.amount), 0) as paid_amount 
           FROM billing b
           LEFT JOIN payments p ON b.id = p.billing_id AND p.status = 'completed'
           WHERE b.id = $1
           GROUP BY b.id, b.amount`,
          [updatedPayment.billing_id]
        );

        const billing = billingResult.rows[0];
        if (billing && parseFloat(billing.paid_amount) >= parseFloat(billing.amount)) {
          await client.query(
            `UPDATE billing SET status = 'paid', paid_date = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [updatedPayment.billing_id]
          );
        } else if (parseFloat(billing.paid_amount) > 0) {
          await client.query(
            `UPDATE billing SET status = 'partial' 
             WHERE id = $1`,
            [updatedPayment.billing_id]
          );
        } else {
          await client.query(
            `UPDATE billing SET status = 'unpaid', paid_date = NULL
             WHERE id = $1`,
            [updatedPayment.billing_id]
          );
        }
      }

      // Update PO status if needed
      if (updatedPayment.po_id) {
        const poResult = await client.query(
          `SELECT po.total_amount, COALESCE(SUM(p.amount), 0) as paid_amount 
           FROM purchase_orders po
           LEFT JOIN payments p ON po.id = p.po_id AND p.status = 'completed'
           WHERE po.id = $1
           GROUP BY po.id, po.total_amount`,
          [updatedPayment.po_id]
        );

        const po = poResult.rows[0];
        if (po && parseFloat(po.paid_amount) >= parseFloat(po.total_amount)) {
          await client.query(
            `UPDATE purchase_orders SET status = 'paid', paid_date = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [updatedPayment.po_id]
          );
        } else if (parseFloat(po.paid_amount) > 0) {
          await client.query(
            `UPDATE purchase_orders SET status = 'partial' 
             WHERE id = $1`,
            [updatedPayment.po_id]
          );
        } else {
          await client.query(
            `UPDATE purchase_orders SET status = 'pending', paid_date = NULL
             WHERE id = $1`,
            [updatedPayment.po_id]
          );
        }
      }

      await client.query('COMMIT');
      return updatedPayment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  delete: async (id, db = pool) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Get payment details before deletion
      const paymentResult = await client.query(
        'SELECT billing_id, po_id, amount FROM payments WHERE id = $1',
        [id]
      );
      
      const payment = paymentResult.rows[0];

      // Delete payment
      await client.query('DELETE FROM payments WHERE id = $1', [id]);

      // Update billing status after deletion
      if (payment && payment.billing_id) {
        const billingResult = await client.query(
          `SELECT b.amount, COALESCE(SUM(p.amount), 0) as paid_amount 
           FROM billing b
           LEFT JOIN payments p ON b.id = p.billing_id AND p.status = 'completed'
           WHERE b.id = $1
           GROUP BY b.id, b.amount`,
          [payment.billing_id]
        );

        const billing = billingResult.rows[0];
        if (billing && parseFloat(billing.paid_amount) === 0) {
          await client.query(
            `UPDATE billing SET status = 'unpaid', paid_date = NULL
             WHERE id = $1`,
            [payment.billing_id]
          );
        } else if (billing && parseFloat(billing.paid_amount) > 0) {
          await client.query(
            `UPDATE billing SET status = 'partial'
             WHERE id = $1`,
            [payment.billing_id]
          );
        }
      }

      // Update PO status after deletion
      if (payment && payment.po_id) {
        const poResult = await client.query(
          `SELECT po.total_amount, COALESCE(SUM(p.amount), 0) as paid_amount 
           FROM purchase_orders po
           LEFT JOIN payments p ON po.id = p.po_id AND p.status = 'completed'
           WHERE po.id = $1
           GROUP BY po.id, po.total_amount`,
          [payment.po_id]
        );

        const po = poResult.rows[0];
        if (po && parseFloat(po.paid_amount) === 0) {
          await client.query(
            `UPDATE purchase_orders SET status = 'pending', paid_date = NULL
             WHERE id = $1`,
            [payment.po_id]
          );
        } else if (po && parseFloat(po.paid_amount) > 0) {
          await client.query(
            `UPDATE purchase_orders SET status = 'partial'
             WHERE id = $1`,
            [payment.po_id]
          );
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  getPaymentSummary: async (startDate, endDate, db = pool) => {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(amount) as total_amount,
        COUNT(DISTINCT billing_id) as unique_invoices,
        COUNT(DISTINCT po_id) as unique_pos,
        payment_method,
        status
      FROM payments
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY payment_method, status
    `, [startDate, endDate]);
    return result.rows;
  },

  getCustomerDues: async (customerId, db = pool) => {
    const result = await db.query(`
      SELECT 
        b.id as billing_id,
        b.invoice_number,
        b.amount,
        b.due_date,
        b.status,
        b.created_at,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        (b.amount - COALESCE(SUM(p.amount), 0)) as pending_amount
      FROM billing b
      LEFT JOIN payments p ON b.id = p.billing_id AND p.status = 'completed'
      WHERE b.customer_id = $1
      GROUP BY b.id
      ORDER BY b.due_date ASC
    `, [customerId]);
    
    // Get customer debit/credit balance
    const balanceResult = await db.query(`
      SELECT current_balance FROM customer_balance WHERE customer_id = $1
    `, [customerId]);
    
    const debitCreditBalance = balanceResult.rows[0]?.current_balance || 0;
    
    return {
      dues: result.rows,
      debitCreditBalance: parseFloat(debitCreditBalance),
      totalDues: result.rows.reduce((sum, row) => sum + parseFloat(row.pending_amount || 0), 0) + parseFloat(debitCreditBalance)
    };
  },

  getVendorDues: async (vendorId, db = pool) => {
    const result = await db.query(`
      SELECT 
        po.id as po_id,
        po.po_number,
        po.total_amount,
        po.expected_delivery,
        po.status,
        po.created_at,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        (po.total_amount - COALESCE(SUM(p.amount), 0)) as pending_amount
      FROM purchase_orders po
      LEFT JOIN payments p ON po.id = p.po_id AND p.status = 'completed'
      WHERE po.vendor_id = $1
      GROUP BY po.id
      ORDER BY po.expected_delivery ASC
    `, [vendorId]);
    
    // Get vendor debit/credit balance
    const balanceResult = await db.query(`
      SELECT current_balance FROM vendor_balance WHERE vendor_id = $1
    `, [vendorId]);
    
    const debitCreditBalance = balanceResult.rows[0]?.current_balance || 0;
    
    return {
      dues: result.rows,
      debitCreditBalance: parseFloat(debitCreditBalance),
      totalDues: result.rows.reduce((sum, row) => sum + parseFloat(row.pending_amount || 0), 0) + parseFloat(debitCreditBalance)
    };
  },

  getDuesSummary: async (db = pool) => {
    const result = await db.query(`
      SELECT 
        'customer_dues' as type,
        COALESCE(SUM(b.amount - COALESCE(SUM_PAID.paid_amount, 0)), 0) as billing_dues,
        COUNT(DISTINCT b.customer_id) as count
      FROM billing b
      LEFT JOIN (
        SELECT billing_id, SUM(amount) as paid_amount
        FROM payments
        WHERE status = 'completed'
        GROUP BY billing_id
      ) SUM_PAID ON b.id = SUM_PAID.billing_id
      WHERE b.status IN ('unpaid', 'partial')
      
      UNION ALL
      
      SELECT 
        'vendor_dues' as type,
        COALESCE(SUM(GREATEST(po.total_amount - COALESCE(SUM_PAID.paid_amount, 0), 0)), 0) as billing_dues,
        COUNT(DISTINCT CASE WHEN po.total_amount > COALESCE(SUM_PAID.paid_amount, 0) THEN po.vendor_id END) as count
      FROM purchase_orders po
      LEFT JOIN (
        SELECT po_id, SUM(amount) as paid_amount
        FROM payments
        WHERE status = 'completed'
        GROUP BY po_id
      ) SUM_PAID ON po.id = SUM_PAID.po_id
      WHERE po.total_amount > COALESCE(SUM_PAID.paid_amount, 0)
    `);
    
    // Add debit/credit note balances
    const customerBalances = await db.query(`
      SELECT COALESCE(SUM(current_balance), 0) as total_balance
      FROM customer_balance
      WHERE current_balance > 0
    `);
    
    const vendorBalances = await db.query(`
      SELECT COALESCE(SUM(current_balance), 0) as total_balance
      FROM vendor_balance
      WHERE current_balance > 0
    `);
    
    const customerDueBalance = parseFloat(customerBalances.rows[0]?.total_balance || 0);
    const vendorDueBalance = parseFloat(vendorBalances.rows[0]?.total_balance || 0);
    
    // Add debit/credit balances to the dues
    const formattedResult = result.rows.map(row => {
      const billingDues = parseFloat(row.billing_dues || 0);
      const debitCreditBalance = row.type === 'customer_dues' ? customerDueBalance : vendorDueBalance;
      return {
        type: row.type,
        billing_dues: billingDues,
        debit_credit_balance: debitCreditBalance,
        total_dues: billingDues + debitCreditBalance,
        count: row.count
      };
    });
    
    return formattedResult;
  },

  getOverdueDues: async (days = 7, db = pool) => {
    const result = await db.query(`
      SELECT 
        'customer' as type,
        b.customer_id as entity_id,
        c.name as entity_name,
        COUNT(b.id) as invoice_count,
        COALESCE(SUM(b.amount - COALESCE(SUM_PAID.paid_amount, 0)), 0) as total_due,
        MIN(b.due_date) as oldest_due_date
      FROM billing b
      JOIN customers c ON b.customer_id = c.id
      LEFT JOIN (
        SELECT billing_id, SUM(amount) as paid_amount
        FROM payments
        WHERE status = 'completed'
        GROUP BY billing_id
      ) SUM_PAID ON b.id = SUM_PAID.billing_id
      WHERE b.status IN ('unpaid', 'partial')
      AND b.due_date <= NOW() - INTERVAL '1 day' * $1
      GROUP BY b.customer_id, c.name
      ORDER BY total_due DESC
    `, [days]);
    return result.rows;
  },
};

module.exports = Payment;
