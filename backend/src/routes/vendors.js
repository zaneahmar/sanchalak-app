const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const tokenExpiry = require('../middleware/tokenExpiry');
const tenantAuth = require('../middleware/tenantAuth');

// Apply token expiry and tenant authentication to all routes
router.use(tokenExpiry);
router.use(tenantAuth);

// Get all vendors
router.get('/', async (req, res) => {
  try {
    const vendors = await Vendor.getAll(req.tenantDb);
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get vendor by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.getById(id, req.tenantDb);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new vendor
router.post('/', async (req, res) => {
  try {
    const vendor = await Vendor.create(req.body, req.tenantDb);
    res.status(201).json(vendor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update vendor
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.update(id, req.body, req.tenantDb);
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete vendor
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Vendor.delete(id, req.tenantDb);
    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify GST number
router.post('/verify-gst', async (req, res) => {
  try {
    const { gstin } = req.body;
    
    if (!gstin) {
      return res.status(400).json({ 
        valid: false, 
        error: 'GST number is required' 
      });
    }

    // GST number format validation (15 characters)
    // Format: 2 digits (state code) + 10 digits (PAN) + 1 digit (entity number) + 1 letter (Z) + 1 checksum digit
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    
    if (!gstRegex.test(gstin)) {
      return res.json({ 
        valid: false, 
        message: 'Invalid GST number format',
        details: 'GST number should be 15 characters: 2 digits + 10 characters (PAN) + 3 characters'
      });
    }

    // Validate checksum (basic validation)
    const isValid = validateGSTChecksum(gstin);
    
    if (isValid) {
      res.json({ 
        valid: true, 
        message: 'GST number is valid',
        gstin: gstin
      });
    } else {
      res.json({ 
        valid: false, 
        message: 'Invalid GST number checksum'
      });
    }
  } catch (error) {
    res.status(500).json({ 
      valid: false, 
      error: error.message 
    });
  }
});

// Helper function to validate GST checksum
function validateGSTChecksum(gstin) {
  // This is a basic validation. For production, you might want to integrate with GST API
  // Basic checks:
  // 1. Length is 15
  // 2. Format matches regex
  // 3. PAN is valid format (characters 3-12)
  
  if (gstin.length !== 15) return false;
  
  // Extract PAN (characters 2-11, 0-indexed)
  const pan = gstin.substring(2, 12);
  
  // PAN format: 5 letters + 4 digits + 1 letter
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  
  return panRegex.test(pan);
}

module.exports = router;
