const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const pool = require('../config/database');
const tokenExpiry = require('../middleware/tokenExpiry');
const tenantAuth = require('../middleware/tenantAuth');

// Apply token expiry and tenant authentication to all routes
router.use(tokenExpiry);
router.use(tenantAuth);

// Get all payments
router.get('/', async (req, res) => {
  try {
    const payments = await Payment.getAll(req.tenantDb);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get payment by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.getById(id, req.tenantDb);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get payments for a billing record
router.get('/billing/:billingId', async (req, res) => {
  try {
    const { billingId } = req.params;
    const payments = await Payment.getByBillingId(billingId, req.tenantDb);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get payments for a PO
router.get('/po/:poId', async (req, res) => {
  try {
    const { poId } = req.params;
    const payments = await Payment.getByPoId(poId, req.tenantDb);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer dues
router.get('/customer/:customerId/dues', async (req, res) => {
  try {
    const { customerId } = req.params;
    const dues = await Payment.getCustomerDues(customerId, req.tenantDb);
    res.json(dues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get vendor dues
router.get('/vendor/:vendorId/dues', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const dues = await Payment.getVendorDues(vendorId, req.tenantDb);
    res.json(dues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get overall dues summary
router.get('/summary/dues', async (req, res) => {
  try {
    const summary = await Payment.getDuesSummary(req.tenantDb);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get overdue dues
router.get('/overdue/list', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const overdue = await Payment.getOverdueDues(parseInt(days), req.tenantDb);
    res.json(overdue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create payment
router.post('/', async (req, res) => {
  try {
    const payment = await Payment.create(req.body, req.tenantDb);
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update payment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.update(id, req.body, req.tenantDb);
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete payment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Payment.delete(id, req.tenantDb);
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get payment summary
router.get('/summary/period', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const summary = await Payment.getPaymentSummary(startDate, endDate, req.tenantDb);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
