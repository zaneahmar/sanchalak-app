const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const tenantAuth = require('../middleware/tenantAuth');

// Apply tenant authentication to all routes
router.use(tenantAuth);

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.getAll(req.tenantDb);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.getById(req.params.id, req.tenantDb);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product
router.post('/', async (req, res) => {
  try {
    const { name, description, price, cost, category, stock_quantity } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const product = await Product.create(req.body, req.tenantDb);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const product = await Product.update(req.params.id, req.body, req.tenantDb);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    await Product.delete(req.params.id, req.tenantDb);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
