const pool = require('./database');

const addDueDateToSales = async () => {
  try {
    console.log('Checking if due_date column exists in sales table...');
    
    // Check if due_date column already exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sales' AND column_name = 'due_date'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('due_date column already exists in sales table. No migration needed.');
      return;
    }
    
    console.log('Adding due_date column to sales table...');
    
    // Add due_date column to sales table
    await pool.query(`
      ALTER TABLE sales 
      ADD COLUMN due_date TIMESTAMP
    `);
    
    console.log('✓ Successfully added due_date column to sales table');
    
    // Optionally set default due_date for existing sales (30 days from sale_date)
    console.log('Setting default due_date for existing sales (30 days from sale_date)...');
    await pool.query(`
      UPDATE sales 
      SET due_date = sale_date + INTERVAL '30 days'
      WHERE due_date IS NULL
    `);
    
    console.log('✓ Successfully set default due_date for existing sales');
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  addDueDateToSales()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = addDueDateToSales;
