const express = require('express');
const router = express.Router();
const FinancialReport = require('../models/FinancialReport');
const tokenExpiry = require('../middleware/tokenExpiry');
const tenantAuth = require('../middleware/tenantAuth');

// Apply token expiry and tenant authentication to all routes
router.use(tokenExpiry);
router.use(tenantAuth);

// Generate Profit & Loss Statement
router.get('/profit-loss', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    const report = await FinancialReport.generateProfitLossStatement(startDate, endDate, req.tenantDb);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Balance Sheet
router.get('/balance-sheet', async (req, res) => {
  try {
    const report = await FinancialReport.generateBalanceSheet(req.tenantDb);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Sales Report
router.get('/sales', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    const report = await FinancialReport.generateSalesReport(startDate, endDate, req.tenantDb);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate GST Report
router.get('/gst', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    const report = await FinancialReport.generateGSTReport(startDate, endDate, req.tenantDb);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Customer Report
router.get('/customers', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    const report = await FinancialReport.generateCustomerReport(startDate, endDate, req.tenantDb);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Vendor Report
router.get('/vendors', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    const report = await FinancialReport.generateVendorReport(startDate, endDate, req.tenantDb);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Inventory Report
router.get('/inventory', async (req, res) => {
  try {
    const report = await FinancialReport.generateInventoryReport(req.tenantDb);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
