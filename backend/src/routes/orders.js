const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const tenantAuth = require('../middleware/tenantAuth');

// Apply tenant authentication to all routes
router.use(tenantAuth);

// Get all orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.getAll(req.tenantDb);
    // Fetch items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await Order.getOrderItems(order.id, req.tenantDb);
        return { ...order, items };
      })
    );
    res.json(ordersWithItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get order by ID with items
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.getById(req.params.id, req.tenantDb);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const items = await Order.getOrderItems(req.params.id, req.tenantDb);
    res.json({ ...order, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get orders by customer ID
router.get('/customer/:customerId', async (req, res) => {
  try {
    const orders = await Order.getByCustomerId(req.params.customerId, req.tenantDb);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create order
router.post('/', async (req, res) => {
  try {
    console.log("Creating order with data:", req.body);
    const { customer_id, total_amount, status, shipping_address, items } = req.body;
    
    if (!customer_id || !total_amount) {
      return res.status(400).json({ error: 'customer_id and total_amount are required' });
    }

    const order = await Order.create({
      customer_id,
      total_amount,
      status: status || 'pending',
      shipping_address,
    }, req.tenantDb);

    // Create order items if provided
    let createdItems = [];
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const createdItem = await Order.createOrderItem({
          order_id: order.id,
          ...item,
        }, req.tenantDb);
        createdItems.push(createdItem);
      }
    }

    res.status(201).json({ ...order, items: createdItems });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order
router.put('/:id', async (req, res) => {
  try {
    const status = req.body.status;
    if(status && status.toLowerCase() == 'delivered') {
      const updateStatus = await Order.updateDeliverySatatus(req.params.id, req.tenantDb);
    }
    const order = await Order.update(req.params.id, req.body, req.tenantDb);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete order
router.delete('/:id', async (req, res) => {
  try {
    await Order.delete(req.params.id, req.tenantDb);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
