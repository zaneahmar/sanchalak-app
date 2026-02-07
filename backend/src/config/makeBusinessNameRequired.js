const pool = require('./database');

async function makeBusinessNameRequired() {
  const client = await pool.connect();
  
  try {
    console.log('Making business_name required in user_master table...');

    // First, update any NULL values to a default
    await client.query(`
      UPDATE user_master 
      SET business_name = name 
      WHERE business_name IS NULL
    `);

    console.log('✓ Updated NULL business_name values');

    // Make the column NOT NULL
    await client.query(`
      ALTER TABLE user_master 
      ALTER COLUMN business_name SET NOT NULL
    `);

    console.log('✓ business_name column is now required (NOT NULL)');

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Error making business_name required:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
if (require.main === module) {
  makeBusinessNameRequired()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = makeBusinessNameRequired;
