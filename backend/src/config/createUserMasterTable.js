const pool = require('./database');

async function createUserMasterTable() {
  const client = await pool.connect();
  
  try {
    console.log('Creating user_master table...');

    // Create user_master table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_master (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        business_name VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        address VARCHAR(255),
        city VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(255) UNIQUE NOT NULL,
        gstin VARCHAR(50),
        is_active BOOLEAN DEFAULT false,
        db_config JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✓ user_master table created successfully');

    // Create index on email for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_master_email ON user_master(email)
    `);

    console.log('✓ Index on email created successfully');

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Error creating user_master table:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
if (require.main === module) {
  createUserMasterTable()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = createUserMasterTable;
