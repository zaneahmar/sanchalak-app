const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const tenantAuth = require('../middleware/tenantAuth');

// Apply tenant authentication to all routes
router.use(tenantAuth);

// Get all inventory
router.get('/', async (req, res) => {
  try {
    const result = await req.tenantDb.query(`
      SELECT i.*, p.name as product_name
      FROM inventory i 
      JOIN products p ON i.product_id = p.id
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get inventory by product ID
router.get('/:productId', async (req, res) => {
  try {
    const result = await req.tenantDb.query(
      'SELECT * FROM inventory WHERE product_id = $1',
      [req.params.productId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create inventory entry
router.post('/', async (req, res) => {
  try {
    const { product_id, quantity_on_hand, warehouse_location } = req.body;
    
    if (!product_id || quantity_on_hand === undefined) {
      return res.status(400).json({ error: 'product_id and quantity_on_hand are required' });
    }

    const result = await req.tenantDb.query(
      `INSERT INTO inventory (product_id, quantity_on_hand, quantity_available, warehouse_location) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [product_id, quantity_on_hand, quantity_on_hand, warehouse_location]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update inventory
router.put('/:productId', async (req, res) => {
  try {
    const { quantity_on_hand, quantity_reserved, warehouse_location } = req.body;
    const quantity_available = (quantity_on_hand || 0) - (quantity_reserved || 0);

    const result = await req.tenantDb.query(
      `UPDATE inventory 
       SET quantity_on_hand = COALESCE($1, quantity_on_hand), 
           quantity_reserved = COALESCE($2, quantity_reserved),
           quantity_available = $3,
           warehouse_location = COALESCE($4, warehouse_location),
           updated_at = CURRENT_TIMESTAMP 
       WHERE product_id = $5 
       RETURNING *`,
      [quantity_on_hand, quantity_reserved, quantity_available, warehouse_location, req.params.productId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete inventory
router.delete('/:productId', async (req, res) => {
  try {
    await req.tenantDb.query('DELETE FROM inventory WHERE product_id = $1', [req.params.productId]);
    res.json({ message: 'Inventory deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
