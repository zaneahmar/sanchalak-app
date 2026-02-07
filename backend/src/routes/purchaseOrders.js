const express = require('express');
const router = express.Router();
const PurchaseOrder = require('../models/PurchaseOrder');
const Vendor = require('../models/Vendor');
const DebitCreditNote = require('../models/DebitCreditNote');
const tenantAuth = require('../middleware/tenantAuth');

// Apply tenant authentication to all routes
router.use(tenantAuth);

// Get all purchase orders
router.get('/', async (req, res) => {
  try {
    const pos = await PurchaseOrder.getAll(req.tenantDb);
    res.json(pos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get PO by ID with items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const po = await PurchaseOrder.getById(id, req.tenantDb);
    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }
    const items = await PurchaseOrder.getPoItems(id, req.tenantDb);
    res.json({ ...po, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new PO
router.post('/', async (req, res) => {
  try {
    const { vendor_id, items, ...poData } = req.body;

    // Verify vendor exists
    const vendor = await Vendor.getById(vendor_id, req.tenantDb);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Create PO
    const po = await PurchaseOrder.create({
      ...poData,
      vendor_id,
    }, req.tenantDb);

    // Create PO items
    let totalAmount = 0;
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await PurchaseOrder.createPoItem({
          po_id: po.id,
          product_id: item.product_id || null,
          product_name: item.product_name,
          size: item.size,
          quantity: item.quantity,
          unit_price: item.unit_price,
          hsn_code: item.hsn_code || null,
        }, req.tenantDb);
        totalAmount += item.quantity * item.unit_price;
      }

      // Update total amount
      await PurchaseOrder.update(po.id, {
        ...po,
        total_amount: totalAmount,
      }, req.tenantDb);
    }

    res.status(201).json(po);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update PO
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { items, po_number, ...poData } = req.body;

    console.log('Update PO request:', { id, poData, itemsCount: items?.length });

    // Get the current PO to check vendor_id
    const currentPo = await PurchaseOrder.getById(id, req.tenantDb);
    const vendor_id = poData.vendor_id || currentPo.vendor_id;

    // Don't allow changing PO number - it's a unique identifier
    // Update the PO details (excluding po_number)
    const po = await PurchaseOrder.update(id, poData, req.tenantDb);
    console.log('PO updated:', po);

    // Handle items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      console.log('Deleting old items for PO:', id);
      // Delete existing items for this PO
      await PurchaseOrder.deletePoItems(id, req.tenantDb);

      // Add new items
      let totalAmount = 0;
      for (const item of items) {
        // Skip if item doesn't have required fields
        if ((item.product_name || item.product_id) && item.quantity && item.unit_price) {
          console.log('Creating item:', item);
          await PurchaseOrder.createPoItem({
            po_id: id,
            product_id: item.product_id || null,
            product_name: item.product_name,
            size: item.size,
            quantity: item.quantity,
            unit_price: item.unit_price,
            hsn_code: item.hsn_code || null,
          }, req.tenantDb);
          totalAmount += item.quantity * item.unit_price;
        } else {
          console.log('Skipping item (missing required fields):', item);
        }
      }

      console.log('Total amount calculated:', totalAmount);
      
      // Update total amount
      await PurchaseOrder.update(id, {
        total_amount: totalAmount,
      }, req.tenantDb);

      // Update vendor debit note with new items and amount
      try {
        const debitNoteNumber = `VDN-PO-${id}`;
        
        // Find the existing debit note
        const vendorDebitNotes = await DebitCreditNote.getVendorDebitNotes(vendor_id, req.tenantDb);
        const existingDebitNote = vendorDebitNotes.find(n => n.debit_note_number === debitNoteNumber);

        if (existingDebitNote) {
          // Update the debit note amount
          await DebitCreditNote.updateVendorDebitNote(existingDebitNote.id, {
            amount: totalAmount,
            description: `Updated from PO #${po.po_number}`,
          }, req.tenantDb);

          // Delete old debit note items and create new ones
          console.log('Updating debit note items...');
          await DebitCreditNote.deleteDebitNoteItems(existingDebitNote.id, false, req.tenantDb); // false for vendor
          
          // Create new debit note items
          await DebitCreditNote.createDebitNoteItems(existingDebitNote.id, items.map(item => ({
            product_id: item.product_id || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            amount: item.quantity * item.unit_price,
          })), false, req.tenantDb); // false for vendor
        }
      } catch (dnError) {
        console.error('Error updating vendor debit note:', dnError);
        // Don't fail the PO update if debit note update fails
      }
    } else {
      console.log('No items provided for update');
    }

    // Fetch updated PO with items
    const updatedPo = await PurchaseOrder.getById(id, req.tenantDb);
    const poItems = await PurchaseOrder.getPoItems(id, req.tenantDb);
    console.log('Returning updated PO:', { po: updatedPo, itemsCount: poItems.length });
    res.json({ ...updatedPo, items: poItems });
  } catch (error) {
    console.error('Error updating PO:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update PO status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const po = await PurchaseOrder.updateStatus(id, status, req.tenantDb);
    res.json(po);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete PO
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await PurchaseOrder.delete(id, req.tenantDb);
    res.json({ message: 'Purchase Order and associated debit notes deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get POs by status
router.get('/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const pos = await PurchaseOrder.getByStatus(status, req.tenantDb);
    res.json(pos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dropdown products from purchase orders
router.get('/dropdown/products', async (req, res) => {
  try {
    const result = await PurchaseOrder.getDropdownProducts(req.tenantDb);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
