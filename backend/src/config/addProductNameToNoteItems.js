const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function migrateTenantDatabase(dbName) {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: String(process.env.DB_PASSWORD || 'admin'),
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: dbName,
  });
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log(`\n[${dbName}] Adding product_name column to debit_note_items table...`);
    
    // Check if column already exists in debit_note_items
    const debitItemsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'debit_note_items' 
      AND column_name = 'product_name'
    `);

    if (debitItemsCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE debit_note_items 
        ADD COLUMN product_name VARCHAR(255)
      `);
      console.log(`[${dbName}] ✓ Added product_name column to debit_note_items`);
    } else {
      console.log(`[${dbName}] ✓ product_name column already exists in debit_note_items`);
    }

    console.log(`[${dbName}] Adding product_name column to credit_note_items table...`);
    
    // Check if column already exists in credit_note_items
    const creditItemsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'credit_note_items' 
      AND column_name = 'product_name'
    `);

    if (creditItemsCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE credit_note_items 
        ADD COLUMN product_name VARCHAR(255)
      `);
      console.log(`[${dbName}] ✓ Added product_name column to credit_note_items`);
    } else {
      console.log(`[${dbName}] ✓ product_name column already exists in credit_note_items`);
    }

    await client.query('COMMIT');
    console.log(`[${dbName}] ✓ Migration completed successfully!`);
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[${dbName}] ✗ Migration failed:`, error.message);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

async function addProductNameColumns() {
  console.log('Starting product_name migration for all tenant databases...\n');
  
  const tenantDatabases = ['bengal_shoe_store', 'upgrad_shoe'];
  
  for (const dbName of tenantDatabases) {
    await migrateTenantDatabase(dbName);
  }
  
  console.log('\n✓ All migrations completed!');
}

// Run the migration
addProductNameColumns().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
