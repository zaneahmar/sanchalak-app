const pool = require('./database');

const migratePOItems = async () => {
  try {
    console.log('Starting PO Items table migration...');

    // Drop the old po_items table
    await pool.query(`DROP TABLE IF EXISTS po_items CASCADE;`);
    console.log('Dropped old po_items table');

    // Create the new po_items table with product_name and size fields
    await pool.query(`
      CREATE TABLE IF NOT EXISTS po_items (
        id SERIAL PRIMARY KEY,
        po_id INT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        product_id INT REFERENCES products(id),
        product_name VARCHAR(100),
        size VARCHAR(50),
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created new po_items table with product_name and size fields');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migratePOItems();
