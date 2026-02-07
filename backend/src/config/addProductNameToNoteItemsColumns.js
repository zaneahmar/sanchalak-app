const { Pool } = require('pg');
const path = require('path');

// Load .env from backend directory
const envPath = path.resolve(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

console.log('Loading .env from:', envPath);

// Validate required environment variables
if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
  console.error('❌ Error: Missing required environment variables');
  console.error('Required: DB_USER, DB_PASSWORD');
  console.error('Current values:');
  console.error('  DB_USER:', process.env.DB_USER || '(not set)');
  console.error('  DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : '(not set)');
  console.error('  DB_HOST:', process.env.DB_HOST || 'localhost');
  console.error('  DB_PORT:', process.env.DB_PORT || '5432');
  process.exit(1);
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST || 'localhost',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 5432,
});

async function addProductNameColumns() {
  const client = await pool.connect();
  
  try {
    // Get all tenant databases
    const dbResult = await client.query(`
      SELECT datname 
      FROM pg_database 
      WHERE datname LIKE 'tenant_%'
    `);

    console.log(`Found ${dbResult.rows.length} tenant databases`);

    for (const row of dbResult.rows) {
      const dbName = row.datname;
      console.log(`\nProcessing database: ${dbName}`);

      // Connect to tenant database
      const tenantPool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST || 'localhost',
        password: process.env.DB_PASSWORD,
        database: dbName,
        port: process.env.DB_PORT || 5432,
      });

      const tenantClient = await tenantPool.connect();

      try {
        await tenantClient.query('BEGIN');

        // Check if product_name column exists in credit_note_items
        const creditNoteItemsCheck = await tenantClient.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'credit_note_items' 
          AND column_name = 'product_name'
        `);

        if (creditNoteItemsCheck.rows.length === 0) {
          console.log(`  Adding product_name to credit_note_items...`);
          await tenantClient.query(`
            ALTER TABLE credit_note_items 
            ADD COLUMN IF NOT EXISTS product_name VARCHAR(255)
          `);
          console.log(`  ✓ Added product_name to credit_note_items`);
        } else {
          console.log(`  ✓ product_name already exists in credit_note_items`);
        }

        // Check if product_name column exists in debit_note_items
        const debitNoteItemsCheck = await tenantClient.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'debit_note_items' 
          AND column_name = 'product_name'
        `);

        if (debitNoteItemsCheck.rows.length === 0) {
          console.log(`  Adding product_name to debit_note_items...`);
          await tenantClient.query(`
            ALTER TABLE debit_note_items 
            ADD COLUMN IF NOT EXISTS product_name VARCHAR(255)
          `);
          console.log(`  ✓ Added product_name to debit_note_items`);
        } else {
          console.log(`  ✓ product_name already exists in debit_note_items`);
        }

        await tenantClient.query('COMMIT');
        console.log(`✓ Successfully updated ${dbName}`);

      } catch (error) {
        await tenantClient.query('ROLLBACK');
        console.error(`✗ Error updating ${dbName}:`, error.message);
      } finally {
        tenantClient.release();
        await tenantPool.end();
      }
    }

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
addProductNameColumns()
  .then(() => {
    console.log('Script finished successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
