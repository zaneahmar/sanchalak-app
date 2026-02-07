const pool = require('./database');

const addPaymentTrackingColumns = async () => {
  try {
    // Add paid_date column to purchase_orders if it doesn't exist
    await pool.query(`
      ALTER TABLE purchase_orders
      ADD COLUMN IF NOT EXISTS paid_date TIMESTAMP;
    `);
    console.log('✓ Added paid_date column to purchase_orders table');

    // Add paid_date column to billing if it doesn't exist
    await pool.query(`
      ALTER TABLE billing
      ADD COLUMN IF NOT EXISTS paid_date TIMESTAMP;
    `);
    console.log('✓ Added paid_date column to billing table');

  } catch (error) {
    console.error('Error adding payment tracking columns:', error.message);
  }
};

module.exports = addPaymentTrackingColumns;
