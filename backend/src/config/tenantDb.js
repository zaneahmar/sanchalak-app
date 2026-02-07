const { Pool } = require('pg');
require('dotenv').config();

// Master pool for user_master table
const masterPool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Cache for tenant database pools
const tenantPools = {};

/**
 * Create a new database for a tenant
 * @param {string} businessName - The business name to create database from
 * @returns {Promise<{dbName: string, dbConfig: object}>}
 */
async function createTenantDatabase(businessName) {
  let client;
  
  try {
    // Sanitize business name to create a valid database name
    const dbName = sanitizeDbName(businessName);
    console.log(`[Tenant DB] Attempting to create database: ${dbName}`);
    
    // We need a direct connection (not from pool) to create database
    // because CREATE DATABASE cannot run inside a transaction block
    const { Client } = require('pg');
    client = new Client({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
    });
    
    await client.connect();
    console.log('[Tenant DB] Connected to master database');
    
    // Check if database already exists
    const checkDb = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (checkDb.rows.length === 0) {
      // Create the database
      console.log(`[Tenant DB] Creating database: ${dbName}`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✓ Database ${dbName} created successfully`);
    } else {
      console.log(`[Tenant DB] Database ${dbName} already exists`);
    }

    // Close the client connection
    await client.end();
    client = null;

    // Return database configuration
    const dbConfig = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      database: dbName,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    };

    console.log(`[Tenant DB] Initializing tables in database: ${dbName}`);
    // Initialize the tenant database with required tables
    await initializeTenantDatabase(dbConfig);
    console.log(`[Tenant DB] Database ${dbName} fully initialized`);

    return { dbName, dbConfig };
  } catch (error) {
    console.error('[Tenant DB] Error creating tenant database:', error);
    console.error('[Tenant DB] Error details:', error.message);
    console.error('[Tenant DB] Stack trace:', error.stack);
    throw error;
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (err) {
        console.error('[Tenant DB] Error closing client:', err);
      }
    }
  }
}

/**
 * Sanitize business name to create a valid PostgreSQL database name
 * @param {string} businessName 
 * @returns {string}
 */
function sanitizeDbName(businessName) {
  // Convert to lowercase, replace spaces and special characters with underscore
  let dbName = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  
  // PostgreSQL database names must start with a letter
  if (!/^[a-z]/.test(dbName)) {
    dbName = 'db_' + dbName;
  }
  
  // Limit length to 63 characters (PostgreSQL limit)
  if (dbName.length > 63) {
    dbName = dbName.substring(0, 63);
  }
  
  return dbName;
}

/**
 * Initialize tenant database with required tables
 * @param {object} dbConfig 
 */
async function initializeTenantDatabase(dbConfig) {
  let tenantPool;
  let client;
  
  try {
    console.log(`[Init] Connecting to tenant database: ${dbConfig.database}`);
    
    tenantPool = new Pool(dbConfig);
    client = await tenantPool.connect();
    console.log(`[Init] Connected successfully to ${dbConfig.database}`);

    // Create products table
    await client.query(`
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
      )
    `);

    // Create customers table
    await client.query(`
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
      )
    `);

    // Create vendors table
    await client.query(`
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
      )
    `);

    // Create orders table
    await client.query(`
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
      )
    `);

    // Create order_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INT NOT NULL REFERENCES products(id),
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sales table
    await client.query(`
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
      )
    `);

    // Create sale_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        sale_id VARCHAR(50) NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        product_id INT NOT NULL REFERENCES products(id),
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create purchase_orders table
    await client.query(`
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
      )
    `);

    // Create po_items table
    await client.query(`
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
      )
    `);

    // Create billing table
    await client.query(`
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
      )
    `);

    // Create payments table
    await client.query(`
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
      )
    `);

    // Create debit_credit_notes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS debit_credit_notes (
        id SERIAL PRIMARY KEY,
        note_type VARCHAR(20) NOT NULL,
        note_number VARCHAR(50) UNIQUE NOT NULL,
        entity_type VARCHAR(20) NOT NULL,
        entity_id INTEGER NOT NULL,
        reference_type VARCHAR(50),
        reference_id INTEGER,
        note_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reason TEXT NOT NULL,
        subtotal DECIMAL(12, 2) NOT NULL,
        cgst DECIMAL(10, 2) DEFAULT 0,
        sgst DECIMAL(10, 2) DEFAULT 0,
        igst DECIMAL(10, 2) DEFAULT 0,
        total_amount DECIMAL(12, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'draft',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create debit_credit_note_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS debit_credit_note_items (
        id SERIAL PRIMARY KEY,
        note_id INTEGER REFERENCES debit_credit_notes(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        description TEXT,
        quantity INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        gst_rate DECIMAL(5, 2) DEFAULT 0,
        total DECIMAL(12, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create inventory table
    await client.query(`
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
      )
    `);

    // Create financial_reports table
    await client.query(`
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
      )
    `);

    // Create customer_ledger table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_ledger (
        id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        billing_id INT REFERENCES billing(id),
        transaction_type VARCHAR(20),
        amount DECIMAL(10, 2),
        balance DECIMAL(10, 2),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create vendor_debit_notes table
    await client.query(`
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
      )
    `);

    // Create vendor_credit_notes table
    await client.query(`
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
      )
    `);

    // Create customer_debit_notes table
    await client.query(`
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
      )
    `);

    // Create customer_credit_notes table
    await client.query(`
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
      )
    `);

    // Create credit_note_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS credit_note_items (
        id SERIAL PRIMARY KEY,
        customer_credit_note_id INT REFERENCES customer_credit_notes(id) ON DELETE CASCADE,
        vendor_credit_note_id INT REFERENCES vendor_credit_notes(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id),
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create customer_balance table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_balance (
        id SERIAL PRIMARY KEY,
        customer_id INT NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
        opening_balance DECIMAL(15, 2) DEFAULT 0,
        current_balance DECIMAL(15, 2) DEFAULT 0,
        total_debit DECIMAL(15, 2) DEFAULT 0,
        total_credit DECIMAL(15, 2) DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create vendor_balance table
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendor_balance (
        id SERIAL PRIMARY KEY,
        vendor_id INT NOT NULL UNIQUE REFERENCES vendors(id) ON DELETE CASCADE,
        opening_balance DECIMAL(15, 2) DEFAULT 0,
        current_balance DECIMAL(15, 2) DEFAULT 0,
        total_debit DECIMAL(15, 2) DEFAULT 0,
        total_credit DECIMAL(15, 2) DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create debit_note_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS debit_note_items (
        id SERIAL PRIMARY KEY,
        customer_debit_note_id INT REFERENCES customer_debit_notes(id) ON DELETE CASCADE,
        vendor_debit_note_id INT REFERENCES vendor_debit_notes(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id),
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log(`[Init] ✓ Database ${dbConfig.database} initialized successfully`);
  } catch (error) {
    console.error(`[Init] Error initializing database ${dbConfig.database}:`, error);
    console.error(`[Init] Error message:`, error.message);
    console.error(`[Init] Error stack:`, error.stack);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('[Init] Error releasing client:', releaseError);
      }
    }
    if (tenantPool) {
      try {
        await tenantPool.end();
      } catch (endError) {
        console.error('[Init] Error ending pool:', endError);
      }
    }
  }
}

/**
 * Get a pool for a tenant database
 * @param {object} dbConfig 
 * @returns {Pool}
 */
function getTenantPool(dbConfig) {
  const dbName = dbConfig.database;
  
  // Return cached pool if exists
  if (tenantPools[dbName]) {
    return tenantPools[dbName];
  }
  
  // Create new pool
  const pool = new Pool(dbConfig);
  
  pool.on('error', (err) => {
    console.error(`Unexpected error on tenant pool ${dbName}:`, err);
  });
  
  // Cache the pool
  tenantPools[dbName] = pool;
  
  return pool;
}

/**
 * Close all tenant pools
 */
async function closeAllTenantPools() {
  const poolNames = Object.keys(tenantPools);
  await Promise.all(poolNames.map(name => tenantPools[name].end()));
  console.log('All tenant pools closed');
}

module.exports = {
  masterPool,
  createTenantDatabase,
  getTenantPool,
  closeAllTenantPools,
  sanitizeDbName
};
