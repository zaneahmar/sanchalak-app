const pool = require('./database');

const initializeDatabase = async () => {
  try {
  
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(50),
        state VARCHAR(50),
        zip_code VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        cost DECIMAL(10, 2),
        sku VARCHAR(50),
        category VARCHAR(50),
        hsn_code VARCHAR(20),
        color VARCHAR(50),
        stock_quantity INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL REFERENCES customers(id),
        order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        shipping_address TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INT NOT NULL REFERENCES products(id),
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        product_id INT NOT NULL UNIQUE REFERENCES products(id),
        quantity_on_hand INT DEFAULT 0,
        quantity_reserved INT DEFAULT 0,
        quantity_available INT DEFAULT 0,
        warehouse_location VARCHAR(100),
        last_restocked TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id VARCHAR(50) PRIMARY KEY,
        customer_id INT REFERENCES customers(id),
        subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
        gst_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
        gst_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        total_amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'cash',
        notes TEXT,
        sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        due_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        sale_id VARCHAR(50) NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        product_id INT NOT NULL REFERENCES products(id),
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS billing (
        id SERIAL PRIMARY KEY,
        order_id INT REFERENCES orders(id),
        sale_id VARCHAR(100),
        customer_id INT NOT NULL REFERENCES customers(id),
        invoice_number VARCHAR(50) UNIQUE,
        subtotal DECIMAL(10, 2),
        gst_amount DECIMAL(10, 2),
        gst_rate DECIMAL(5, 2) DEFAULT 18.00,
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'unpaid',
        due_date TIMESTAMP,
        paid_date TIMESTAMP,
        payment_method VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Vendors table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        city VARCHAR(50),
        state VARCHAR(50),
        zip_code VARCHAR(20),
        tax_id VARCHAR(50),
        bank_account VARCHAR(50),
        gstin VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Purchase Orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(50) UNIQUE NOT NULL,
        vendor_id INT NOT NULL REFERENCES vendors(id),
        po_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expected_delivery TIMESTAMP,
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        paid_date TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Purchase Order Items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS po_items (
        id SERIAL PRIMARY KEY,
        po_id INT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id),
        product_name VARCHAR(100),
        size VARCHAR(50),
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        hsn_code varchar(20) null
      );
    `);

    // Payment Records table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        billing_id INT REFERENCES billing(id),
        po_id INT REFERENCES purchase_orders(id),
        amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50),
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reference_number VARCHAR(100),
        status VARCHAR(20) DEFAULT 'completed',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Financial Reports table (for caching calculations)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS financial_reports (
        id SERIAL PRIMARY KEY,
        report_type VARCHAR(50),
        report_date DATE,
        revenue DECIMAL(15, 2),
        expenses DECIMAL(15, 2),
        profit DECIMAL(15, 2),
        gst_collected DECIMAL(10, 2),
        gst_paid DECIMAL(10, 2),
        cash_balance DECIMAL(15, 2),
        data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Customer Credit/Ledger table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_ledger (
        id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        billing_id INT REFERENCES billing(id),
        transaction_type VARCHAR(20),
        amount DECIMAL(10, 2),
        balance DECIMAL(10, 2),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Vendor Debit Notes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendor_debit_notes (
        id SERIAL PRIMARY KEY,
        vendor_id INT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        debit_note_number VARCHAR(50) UNIQUE NOT NULL,
        po_id INT REFERENCES purchase_orders(id),
        reason VARCHAR(100),
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT,
        note_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending',
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Vendor Credit Notes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendor_credit_notes (
        id SERIAL PRIMARY KEY,
        vendor_id INT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        credit_note_number VARCHAR(50) UNIQUE NOT NULL,
        po_id INT REFERENCES purchase_orders(id),
        reason VARCHAR(100),
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT,
        note_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending',
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Customer Debit Notes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_debit_notes (
        id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        debit_note_number VARCHAR(50) UNIQUE NOT NULL,
        billing_id INT REFERENCES billing(id),
        reason VARCHAR(100),
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT,
        note_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending',
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Customer Credit Notes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_credit_notes (
        id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        credit_note_number VARCHAR(50) UNIQUE NOT NULL,
        billing_id INT REFERENCES billing(id),
        reason VARCHAR(100),
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT,
        note_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending',
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Credit Note Items table (for product details)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS credit_note_items (
        id SERIAL PRIMARY KEY,
        customer_credit_note_id INT REFERENCES customer_credit_notes(id) ON DELETE CASCADE,
        vendor_credit_note_id INT REFERENCES vendor_credit_notes(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id),
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);


    // Customer Balance/Ledger table (for tracking debit and credit balance)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_balance (
        id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
        opening_balance DECIMAL(15, 2) DEFAULT 0,
        current_balance DECIMAL(15, 2) DEFAULT 0,
        total_debit DECIMAL(15, 2) DEFAULT 0,
        total_credit DECIMAL(15, 2) DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Vendor Balance/Ledger table (for tracking debit and credit balance)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendor_balance (
        id SERIAL PRIMARY KEY,
        vendor_id INT NOT NULL UNIQUE REFERENCES vendors(id) ON DELETE CASCADE,
        opening_balance DECIMAL(15, 2) DEFAULT 0,
        current_balance DECIMAL(15, 2) DEFAULT 0,
        total_debit DECIMAL(15, 2) DEFAULT 0,
        total_credit DECIMAL(15, 2) DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Debit Note Items table (for product details)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS debit_note_items (
        id SERIAL PRIMARY KEY,
        customer_debit_note_id INT REFERENCES customer_debit_notes(id) ON DELETE CASCADE,
        vendor_debit_note_id INT REFERENCES vendor_debit_notes(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id),
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    
    // Add GST columns to sales table if they don't exist
    try {
      // Check if columns exist
      const columnsCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name IN ('subtotal', 'gst_percentage', 'gst_amount')
      `);
      
      const existingColumns = new Set(columnsCheck.rows.map(row => row.column_name));
      
      if (!existingColumns.has('subtotal')) {
        await pool.query(`ALTER TABLE sales ADD COLUMN subtotal DECIMAL(10, 2) DEFAULT 0;`);
        console.log('✓ Added subtotal column to sales table');
      }
      
      if (!existingColumns.has('gst_percentage')) {
        await pool.query(`ALTER TABLE sales ADD COLUMN gst_percentage DECIMAL(5, 2) DEFAULT 0;`);
        console.log('✓ Added gst_percentage column to sales table');
      }
      
      if (!existingColumns.has('gst_amount')) {
        await pool.query(`ALTER TABLE sales ADD COLUMN gst_amount DECIMAL(10, 2) DEFAULT 0;`);
        console.log('✓ Added gst_amount column to sales table');
      }
    } catch (error) {
      console.log('Note: GST columns migration skipped:', error.message);
    }

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

module.exports = initializeDatabase;
