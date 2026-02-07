const pool = require('./database');

const seedDatabase = async () => {
  try {
    // Check if vendors already exist
    const vendorCheck = await pool.query('SELECT COUNT(*) FROM vendors');
    if (vendorCheck.rows[0].count > 0) {
      console.log('Vendors already exist, skipping seed');
      return;
    }

    // Insert sample vendors
    await pool.query(`
      INSERT INTO vendors (name, email, phone, address, city, state, zip_code, tax_id, bank_account, gstin)
      VALUES 
        ('ABC Shoe Manufacturers', 'supplier@abcshoes.com', '9876543210', '123 Industrial Area', 'Chennai', 'Tamil Nadu', '600001', 'TAX123456', 'ACC1234567890', '33AABCU9603R1Z0'),
        ('XYZ Footwear Ltd', 'info@xyzfootwear.com', '8765432109', '456 Business Park', 'Bangalore', 'Karnataka', '560001', 'TAX654321', 'ACC0987654321', '29AABCU9603R1Z0'),
        ('Premium Shoe Co', 'contact@premiumshoe.com', '7654321098', '789 Trade Center', 'Mumbai', 'Maharashtra', '400001', 'TAX789012', 'ACC1111111111', '27AABCU9603R1Z0')
    `);
    console.log('Sample vendors inserted');

    // Insert sample products
    await pool.query(`
      INSERT INTO products (name, description, price, cost, sku, category, stock_quantity, hsn_code, color)
      VALUES 
        ('Casual Canvas Shoes', 'Comfortable casual canvas shoes for everyday wear', 1299.00, 600.00, 'SHOE-001', 'Casual', 50, '6403', 'Black'),
        ('Sports Running Shoes', 'High performance running shoes with cushioning', 2999.00, 1200.00, 'SHOE-002', 'Sports', 30, '6403', 'Blue'),
        ('Formal Leather Shoes', 'Premium leather formal shoes for business', 4999.00, 2000.00, 'SHOE-003', 'Formal', 25, '6403', 'Brown'),
        ('Kids School Shoes', 'Durable school shoes for children', 899.00, 400.00, 'SHOE-004', 'Kids', 60, '6403', 'Black'),
        ('Winter Boots', 'Warm and waterproof winter boots', 3499.00, 1500.00, 'SHOE-005', 'Winter', 20, '6403', 'Dark Brown'),
        ('Sneaker Shoes', 'Trendy sneaker shoes for casual wear', 2299.00, 900.00, 'SHOE-006', 'Casual', 40, '6403', 'White'),
        ('Sandals', 'Comfortable sandals for summer', 599.00, 250.00, 'SHOE-007', 'Summer', 100, '6403', 'Brown'),
        ('Party Shoes', 'Elegant party shoes for special occasions', 5999.00, 2500.00, 'SHOE-008', 'Formal', 15, '6403', 'Gold')
    `);
    console.log('Sample products inserted');

  } catch (error) {
    // If seed data already exists, continue silently
    if (error.message.includes('duplicate')) {
      console.log('Sample data already exists');
    } else {
      console.error('Error seeding database:', error.message);
    }
  }
};

module.exports = seedDatabase;
