const pool = require('./database');

async function addBusinessNameColumn() {
  const client = await pool.connect();
  
  try {
    console.log('Adding business_name column to user_master table...');

    // Add business_name column
    await client.query(`
      ALTER TABLE user_master 
      ADD COLUMN IF NOT EXISTS business_name VARCHAR(255)
    `);

    console.log('✓ business_name column added successfully');

    // Create index on business_name for faster searches
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_master_business_name 
      ON user_master(business_name)
    `);

    console.log('✓ Index on business_name created successfully');

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Error adding business_name column:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
if (require.main === module) {
  addBusinessNameColumn()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = addBusinessNameColumn;
