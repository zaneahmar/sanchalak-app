const pool = require('../config/database');

const FinancialReport = {
  // Generate P&L Statement
  generateProfitLossStatement: async (startDate, endDate, db = pool) => {
    // Query from sales table (primary source)
    const salesResult = await db.query(`
      SELECT 
        COALESCE(SUM(s.total_amount), 0) as total_revenue,
        COALESCE(SUM(s.gst_amount), 0) as total_gst,
        COALESCE(COUNT(DISTINCT s.id), 0) as invoice_count
      FROM sales s
      WHERE DATE(s.sale_date) BETWEEN $1 AND $2
    `, [startDate, endDate]);

    // Also query from billing table as fallback/additional source
    const billingResult = await db.query(`
      SELECT 
        COALESCE(SUM(b.amount), 0) as total_revenue,
        COALESCE(SUM(b.gst_amount), 0) as total_gst,
        COALESCE(COUNT(DISTINCT b.id), 0) as invoice_count
      FROM billing b
      WHERE DATE(b.created_at) BETWEEN $1 AND $2
    `, [startDate, endDate]);

    // Calculate collected revenue from actual payments (includes partial payments)
    const paymentsResult = await db.query(`
      SELECT 
        COALESCE(SUM(p.amount), 0) as collected_revenue
      FROM payments p
      LEFT JOIN billing b ON p.billing_id = b.id
      WHERE p.status = 'completed' and sale_id is not null
      AND DATE(COALESCE(b.created_at, p.payment_date)) BETWEEN $1 AND $2
    `, [startDate, endDate]);

    const collectedRevenue = parseFloat(paymentsResult.rows[0].collected_revenue) || 0;

    // Combine results - use billing if it has data, otherwise use sales
    const hasBillingData = parseFloat(billingResult.rows[0].total_revenue) > 0;
    const revenue = hasBillingData ? {
      total_revenue: billingResult.rows[0].total_revenue,
      collected_revenue: collectedRevenue,
      invoice_count: billingResult.rows[0].invoice_count
    } : {
      total_revenue: salesResult.rows[0].total_revenue,
      collected_revenue: salesResult.rows[0].total_revenue, // Assume sales are collected
      invoice_count: salesResult.rows[0].invoice_count
    };

    const gstCollected = hasBillingData ? 
      parseFloat(billingResult.rows[0].total_gst) : 
      parseFloat(salesResult.rows[0].total_gst);

    // Calculate cost of goods sold (COGS) from order_items
    const cogsResult = await db.query(`
      SELECT 
        COALESCE(SUM(oi.quantity * p.cost), 0) as total_cogs
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE DATE(o.created_at) BETWEEN $1 AND $2 AND o.status != 'cancelled'
    `, [startDate, endDate]);

    // Also check sale_items for COGS
    const salesCogsResult = await db.query(`
      SELECT 
        COALESCE(SUM(si.quantity * p.cost), 0) as total_cogs
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN sales s ON si.sale_id = s.id
      WHERE DATE(s.sale_date) BETWEEN $1 AND $2
    `, [startDate, endDate]);

    const cogs = Math.max(
      parseFloat(cogsResult.rows[0].total_cogs) || 0,
      parseFloat(salesCogsResult.rows[0].total_cogs) || 0
    );

    // Calculate gross profit
    const totalRevenue = parseFloat(revenue.total_revenue) || 0;
    const collectedRevenues = parseFloat(revenue.collected_revenue) || 0;
    const grossProfit = totalRevenue - cogs;

    return {
      period: { startDate, endDate },
      revenue: {
        totalRevenue: totalRevenue,
        collectedRevenue: collectedRevenues,
        invoiceCount: revenue.invoice_count,
      },
      costOfGoodsSold: cogs,
      grossProfit: grossProfit,
      grossProfitMargin: totalRevenue ? ((grossProfit / totalRevenue) * 100).toFixed(2) : 0,
      gstCollected: gstCollected || 0,
    };
  },

  // Generate Balance Sheet
  generateBalanceSheet: async (db = pool) => {
    // Cash (from completed payments received from customers)
    const cashResult = await db.query(`
      SELECT 
        COALESCE(SUM(p.amount), 0) as total_cash
      FROM payments p
      WHERE p.status = 'completed' AND p.billing_id IS NOT NULL
    `);

    const cash = parseFloat(cashResult.rows[0].total_cash) || 0;

    // Accounts Receivable (outstanding invoices - what customers owe us)
    const accountsReceivableResult = await db.query(`
      SELECT 
        COALESCE(SUM(
          b.amount - COALESCE((
            SELECT SUM(p.amount) 
            FROM payments p 
            WHERE p.billing_id = b.id AND p.status = 'completed'
          ), 0)
        ), 0) as accounts_receivable
      FROM billing b
      WHERE b.status IN ('unpaid', 'partial')
    `);

    const accountsReceivable = parseFloat(accountsReceivableResult.rows[0].accounts_receivable) || 0;
    
    // Add customer debit/credit note balances to receivables
    const customerBalanceResult = await db.query(`
      SELECT COALESCE(SUM(current_balance), 0) as customer_balance
      FROM customer_balance
      WHERE current_balance != 0
    `);
    
    const customerDebitCreditBalance = parseFloat(customerBalanceResult.rows[0].customer_balance) || 0;
    const totalAccountsReceivable = accountsReceivable + customerDebitCreditBalance;

    // Inventory Value
    const inventoryResult = await db.query(`
      select COALESCE(SUM(COALESCE(p.price, 0) * p.stock_quantity), 0) as inventory_value,
      SUM(COALESCE(p.stock_quantity, 0)) as total_quantity
	    from products p
    `);

    const inventoryValue = parseFloat(inventoryResult.rows[0].inventory_value) || 0;

    // Accounts Payable (what we owe to vendors for purchase orders)
    const accountsPayableResult = await db.query(`
      SELECT 
        COALESCE(SUM(
          po.total_amount - COALESCE((
            SELECT SUM(p.amount) 
            FROM payments p 
            WHERE p.po_id = po.id AND p.status = 'completed'
          ), 0)
        ), 0) as accounts_payable
      FROM purchase_orders po
      WHERE po.status IN ('pending', 'partial', 'approved')
    `);

    const accountsPayable = parseFloat(accountsPayableResult.rows[0].accounts_payable) || 0;
    
    // Add vendor debit/credit note balances to payables
    const vendorBalanceResult = await db.query(`
      SELECT COALESCE(SUM(current_balance), 0) as vendor_balance
      FROM vendor_balance
      WHERE current_balance != 0
    `);
    
    const vendorDebitCreditBalance = parseFloat(vendorBalanceResult.rows[0].vendor_balance) || 0;
    const totalAccountsPayable = accountsPayable + vendorDebitCreditBalance;

    const totalAssets = cash + totalAccountsReceivable + inventoryValue;
    const totalLiabilities = totalAccountsPayable;
    const equity = totalAssets - totalLiabilities;

    return {
      assets: {
        cash: cash,
        accountsReceivable: accountsReceivable,
        customerDebitCreditBalance: customerDebitCreditBalance,
        totalAccountsReceivable: totalAccountsReceivable,
        inventory: inventoryValue,
        totalAssets: totalAssets,
      },
      liabilities: {
        accountsPayable: accountsPayable,
        vendorDebitCreditBalance: vendorDebitCreditBalance,
        totalAccountsPayable: totalAccountsPayable,
        totalLiabilities: totalLiabilities,
      },
      equity: equity,
    };
  },

  // Generate Sales Report
  generateSalesReport: async (startDate, endDate, db = pool) => {
    // Try to get data from sales table first (primary source)
    const salesResult = await db.query(`
      SELECT 
        DATE(s.sale_date) as sale_date,
        COUNT(DISTINCT s.id) as orders,
        COUNT(si.id) as items_sold,
        COALESCE(SUM(s.total_amount), 0) as daily_revenue,
        COALESCE(SUM(si.quantity), 0) as total_quantity,
        STRING_AGG(DISTINCT COALESCE(p.category, 'Uncategorized'), ', ') as category
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE DATE(s.sale_date) BETWEEN $1 AND $2
      GROUP BY DATE(s.sale_date)
      ORDER BY DATE(s.sale_date) DESC
    `, [startDate, endDate]);

    // If no sales data, try orders table as fallback
    if (salesResult.rows.length === 0) {
      const ordersResult = await db.query(`
        SELECT 
          DATE(o.created_at) as sale_date,
          COUNT(DISTINCT o.id) as orders,
          COUNT(oi.id) as items_sold,
          COALESCE(SUM(o.total_amount), 0) as daily_revenue,
          COALESCE(SUM(oi.quantity), 0) as total_quantity,
          STRING_AGG(DISTINCT COALESCE(p.category, 'Uncategorized'), ', ') as category
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE DATE(o.created_at) BETWEEN $1 AND $2 
          AND o.status != 'cancelled'
        GROUP BY DATE(o.created_at)
        ORDER BY DATE(o.created_at) DESC
      `, [startDate, endDate]);
      
      return ordersResult.rows;
    }

    return salesResult.rows;
  },

  // Generate GST Report
  generateGSTReport: async (startDate, endDate, db = pool) => {
    const result = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN COALESCE(gst_rate, 0) = 0 THEN COALESCE(gst_amount, 0) ELSE 0 END), 0) as gst_0_percent,
        COALESCE(SUM(CASE WHEN COALESCE(gst_rate, 0) = 5 THEN COALESCE(gst_amount, 0) ELSE 0 END), 0) as gst_5_percent,
        COALESCE(SUM(CASE WHEN COALESCE(gst_rate, 0) = 12 THEN COALESCE(gst_amount, 0) ELSE 0 END), 0) as gst_12_percent,
        COALESCE(SUM(CASE WHEN COALESCE(gst_rate, 0) = 18 THEN COALESCE(gst_amount, 0) ELSE 0 END), 0) as gst_18_percent,
        COALESCE(SUM(CASE WHEN COALESCE(gst_rate, 0) = 28 THEN COALESCE(gst_amount, 0) ELSE 0 END), 0) as gst_28_percent,
        COALESCE(SUM(COALESCE(gst_amount, 0)), 0) as total_gst,
        COALESCE(SUM(COALESCE(subtotal, amount - gst_amount)), 0) as total_taxable
      FROM billing
      WHERE DATE(created_at) BETWEEN $1 AND $2
    `, [startDate, endDate]);

    return result.rows[0];
  },

  // Generate Customer Report
  generateCustomerReport: async (startDate, endDate, db = pool) => {
    const result = await db.query(`
      SELECT  
        c.id,
        c.name,
        c.email,
        c.phone,
        COUNT(DISTINCT CASE WHEN DATE(b.created_at) BETWEEN $1 AND $2 THEN b.id END) as total_orders,
        COALESCE(SUM(CASE WHEN DATE(b.created_at) BETWEEN $1 AND $2 THEN b.amount ELSE 0 END), 0) as total_spent,
        COALESCE(SUM(
          CASE 
            WHEN DATE(b.created_at) BETWEEN $1 AND $2 AND b.id IS NOT NULL THEN
              COALESCE((
                SELECT SUM(p.amount) 
                FROM payments p 
                WHERE p.billing_id = b.id AND p.status = 'completed'
              ), 0)
            ELSE 0
          END
        ), 0) as paid_amount,
        COALESCE(SUM(
          CASE 
            WHEN DATE(b.created_at) BETWEEN $1 AND $2 AND b.id IS NOT NULL THEN
              b.amount - COALESCE((
                SELECT SUM(p.amount) 
                FROM payments p 
                WHERE p.billing_id = b.id AND p.status = 'completed'
              ), 0)
            ELSE 0
          END
        ), 0) as billing_due_amount,
        COALESCE(cb.current_balance, 0) as debit_credit_balance
      FROM customers c
      LEFT JOIN billing b ON c.id = b.customer_id
      LEFT JOIN customer_balance cb ON c.id = cb.customer_id
      GROUP BY c.id, c.name, c.email, c.phone, cb.current_balance
      HAVING COUNT(DISTINCT CASE WHEN DATE(b.created_at) BETWEEN $1 AND $2 THEN b.id END) > 0
      ORDER BY total_spent DESC
    `, [startDate, endDate]);

    // Fetch payment history for each customer
    const customersWithPayments = await Promise.all(
      result.rows.map(async (customer) => {
        const paymentsResult = await db.query(`
          SELECT 
            p.id,
            p.amount,
            p.payment_method,
            p.payment_date,
            p.reference_number,
            p.notes,
            p.status,
            b.invoice_number,
            b.amount as invoice_amount
          FROM payments p
          LEFT JOIN billing b ON p.billing_id = b.id
          WHERE b.customer_id = $1
            AND p.status = 'completed'
            AND DATE(p.payment_date) BETWEEN $2 AND $3
          ORDER BY p.payment_date DESC
        `, [customer.id, startDate, endDate]);

        // Fetch debit notes for this customer
        const debitNotesResult = await db.query(`
          SELECT 
            id,
            debit_note_number,
            amount,
            reason,
            description,
            note_date,
            status,
            billing_id
          FROM customer_debit_notes
          WHERE customer_id = $1
            AND DATE(note_date) BETWEEN $2 AND $3
            AND status = 'approved'
          ORDER BY note_date DESC
        `, [customer.id, startDate, endDate]);

        // Fetch credit notes for this customer
        const creditNotesResult = await db.query(`
          SELECT 
            id,
            credit_note_number,
            amount,
            reason,
            description,
            note_date,
            status,
            billing_id
          FROM customer_credit_notes
          WHERE customer_id = $1
            AND DATE(note_date) BETWEEN $2 AND $3
            AND status = 'approved'
          ORDER BY note_date DESC
        `, [customer.id, startDate, endDate]);

        return {
          ...customer,
          due_amount: parseFloat(customer.billing_due_amount) + parseFloat(customer.debit_credit_balance),
          payment_history: paymentsResult.rows,
          debit_notes: debitNotesResult.rows,
          credit_notes: creditNotesResult.rows
        };
      })
    );

    return customersWithPayments;
  },

  // Generate Vendor Report
  generateVendorReport: async (startDate, endDate, db = pool) => {
    const result = await db.query(`
      SELECT  
        v.id,
        v.name,
        v.email,
        v.phone,
        COUNT(DISTINCT CASE WHEN DATE(po.po_date) BETWEEN $1 AND $2 THEN po.id END) as total_orders,
        COALESCE(SUM(CASE WHEN DATE(po.po_date) BETWEEN $1 AND $2 THEN po.total_amount ELSE 0 END), 0) as total_purchased,
        COALESCE(SUM(
          CASE 
            WHEN DATE(po.po_date) BETWEEN $1 AND $2 AND po.id IS NOT NULL THEN
              COALESCE((
                SELECT SUM(p.amount) 
                FROM payments p 
                WHERE p.po_id = po.id AND p.status = 'completed'
              ), 0)
            ELSE 0
          END
        ), 0) as paid_amount,
        COALESCE(SUM(
          CASE 
            WHEN DATE(po.po_date) BETWEEN $1 AND $2 AND po.id IS NOT NULL THEN
              po.total_amount - COALESCE((
                SELECT SUM(p.amount) 
                FROM payments p 
                WHERE p.po_id = po.id AND p.status = 'completed'
              ), 0)
            ELSE 0
          END
        ), 0) as purchase_due_amount,
        COALESCE(vb.current_balance, 0) as debit_credit_balance
      FROM vendors v
      LEFT JOIN purchase_orders po ON v.id = po.vendor_id
      LEFT JOIN vendor_balance vb ON v.id = vb.vendor_id
      GROUP BY v.id, v.name, v.email, v.phone, vb.current_balance
      HAVING COUNT(DISTINCT CASE WHEN DATE(po.po_date) BETWEEN $1 AND $2 THEN po.id END) > 0
      ORDER BY total_purchased DESC
    `, [startDate, endDate]);

    // Fetch payment history for each vendor
    const vendorsWithPayments = await Promise.all(
      result.rows.map(async (vendor) => {
        const paymentsResult = await db.query(`
          SELECT 
            p.id,
            p.amount,
            p.payment_method,
            p.payment_date,
            p.reference_number,
            p.notes,
            p.status,
            po.po_number,
            po.total_amount as po_amount
          FROM payments p
          LEFT JOIN purchase_orders po ON p.po_id = po.id
          WHERE po.vendor_id = $1
            AND p.status = 'completed'
            AND DATE(p.payment_date) BETWEEN $2 AND $3
          ORDER BY p.payment_date DESC
        `, [vendor.id, startDate, endDate]);

        // Fetch debit notes for this vendor
        const debitNotesResult = await db.query(`
          SELECT 
            id,
            debit_note_number,
            amount,
            reason,
            description,
            note_date,
            status,
            po_id
          FROM vendor_debit_notes
          WHERE vendor_id = $1
            AND DATE(note_date) BETWEEN $2 AND $3
            AND status = 'approved'
          ORDER BY note_date DESC
        `, [vendor.id, startDate, endDate]);

        // Fetch credit notes for this vendor
        const creditNotesResult = await db.query(`
          SELECT 
            id,
            credit_note_number,
            amount,
            reason,
            description,
            note_date,
            status,
            po_id
          FROM vendor_credit_notes
          WHERE vendor_id = $1
            AND DATE(note_date) BETWEEN $2 AND $3
            AND status = 'approved'
          ORDER BY note_date DESC
        `, [vendor.id, startDate, endDate]);

        return {
          ...vendor,
          due_amount: parseFloat(vendor.purchase_due_amount) + parseFloat(vendor.debit_credit_balance),
          payment_history: paymentsResult.rows,
          debit_notes: debitNotesResult.rows,
          credit_notes: creditNotesResult.rows
        };
      })
    );

    return vendorsWithPayments;
  },

  // Generate Inventory Report
  generateInventoryReport: async (db = pool) => {
    const result = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.category,
        p.price,
        p.cost,
        p.stock_quantity as quantity_on_hand,
        (p.cost * p.stock_quantity) as inventory_value,
        (p.stock_quantity * p.price) as retail_value
      FROM  products p 
      ORDER BY inventory_value DESC
    `);

    return result.rows;
  },

  // Save report for caching
  saveReport: async (reportType, reportDate, data, db = pool) => {
    const result = await db.query(
      `INSERT INTO financial_reports (report_type, report_date, data, revenue, expenses, profit)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [reportType, reportDate, JSON.stringify(data), data.revenue || 0, data.expenses || 0, data.profit || 0]
    );
    return result.rows[0];
  },
};

module.exports = FinancialReport;
