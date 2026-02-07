const pool = require('../config/database');

const Product = {
  getAll: async (db = pool) => {
    const result = await db.query('SELECT * FROM products ORDER BY created_at DESC');
    return result.rows;
  },

  getById: async (id, db = pool) => {
    const result = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    return result.rows[0];
  },

  create: async (product, db = pool) => {
    const { name, description, price, cost, category, stock_quantity, sku, hsn_code, color } = product;
    const result = await db.query(
      'INSERT INTO products (name, description, price, cost, sku, category, stock_quantity, hsn_code, color) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [name, description, price, cost, sku, category, stock_quantity, hsn_code, color]
    );
    return result.rows[0];
  },

  update: async (id, product, db = pool) => {
    const { name, description, price, cost, sku, category, stock_quantity, hsn_code, color } = product;
    const result = await db.query(
      'UPDATE products SET name = $1, description = $2, price = $3, cost = $4, sku = $5, category = $6, stock_quantity = $7, hsn_code = $8, color = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $10 RETURNING *',
      [name, description, price, cost, sku, category, stock_quantity, hsn_code, color, id]
    );
    return result.rows[0];
  },

  delete: async (id, db = pool) => {
    await db.query('DELETE FROM products WHERE id = $1', [id]);
  },

  getBySku: async (sku, db = pool) => {
    const result = await db.query('SELECT * FROM products WHERE sku = $1', [sku]);
    return result.rows[0];
  },
};

module.exports = Product;
