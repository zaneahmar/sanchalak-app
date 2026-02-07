const pool = require('./database');

async function addGSTColumnsToBilling() {
  try {
    console.log('Checking if GST columns exist in billing table...');

    // Check if columns exist
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'billing' 
      AND column_name IN ('subtotal', 'gst_amount', 'gst_rate')
    `);

    const existingColumns = checkResult.rows.map(row => row.column_name);

    // Add missing columns
    if (!existingColumns.includes('subtotal')) {
      console.log('Adding subtotal column to billing table...');
      await pool.query(`
        ALTER TABLE billing 
        ADD COLUMN subtotal DECIMAL(10, 2)
      `);
      console.log('✓ subtotal column added');
    } else {
      console.log('✓ subtotal column already exists');
    }

    if (!existingColumns.includes('gst_amount')) {
      console.log('Adding gst_amount column to billing table...');
      await pool.query(`
        ALTER TABLE billing 
        ADD COLUMN gst_amount DECIMAL(10, 2)
      `);
      console.log('✓ gst_amount column added');
    } else {
      console.log('✓ gst_amount column already exists');
    }

    if (!existingColumns.includes('gst_rate')) {
      console.log('Adding gst_rate column to billing table...');
      await pool.query(`
        ALTER TABLE billing 
        ADD COLUMN gst_rate DECIMAL(5, 2) DEFAULT 18.00
      `);
      console.log('✓ gst_rate column added');
    } else {
      console.log('✓ gst_rate column already exists');
    }

    console.log('\n✓ All GST columns are in place!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding GST columns:', error);
    process.exit(1);
  }
}

addGSTColumnsToBilling();
