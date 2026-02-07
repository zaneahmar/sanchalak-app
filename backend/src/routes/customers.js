const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const tenantAuth = require('../middleware/tenantAuth');

// Apply tenant authentication to all routes
router.use(tenantAuth);

// Get all customers
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.getAll(req.tenantDb);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.getById(req.params.id, req.tenantDb);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create customer
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address, city, state, zip_code } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const customer = await Customer.create(req.body, req.tenantDb);
    res.status(201).json(customer);
  } catch (error) {
    // Check for unique constraint violation on email
    if (error.code === '23505' && error.constraint === 'customers_email_key') {
      return res.status(400).json({ error: 'A customer with this email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const customer = await Customer.update(req.params.id, req.body, req.tenantDb);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    // Check for unique constraint violation on email
    if (error.code === '23505' && error.constraint === 'customers_email_key') {
      return res.status(400).json({ error: 'A customer with this email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    await Customer.delete(req.params.id, req.tenantDb);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
