const pool = require('../config/database');

const Order = {
  getAll: async (db = pool) => {
    const result = await db.query(`
      SELECT 
    o.id,
    o.customer_id,
    o.order_date,
    o.total_amount,
    o.status,
    o.shipping_address,
    o.notes,
    o.created_at,
    o.updated_at,

    c.name  AS customer_name,
    c.email,

    string_agg(DISTINCT p.category, ', ') AS category,
    string_agg(DISTINCT p.name, ', ')     AS product_name

FROM orders o
JOIN customers c 
  ON o.customer_id = c.id

JOIN order_items ot 
  ON ot.order_id = o.id

JOIN products p 
  ON p.id = ot.product_id

GROUP BY
    o.id,
    o.customer_id,
    o.order_date,
    o.total_amount,
    o.status,
    o.shipping_address,
    o.notes,
    o.created_at,
    o.updated_at,
    c.name,
    c.email

ORDER BY o.created_at DESC;
    `);
    return result.rows;
  },

  getById: async (id, db = pool) => {
    const result = await db.query(`
      SELECT o.*, c.name as customer_name 
      FROM orders o 
      JOIN customers c ON o.customer_id = c.id 
      WHERE o.id = $1
    `, [id]);
    return result.rows[0];
  },

  getOrderItems: async (orderId, db = pool) => {
    const result = await db.query(`
      SELECT oi.*, p.name as product_name
      FROM order_items oi 
      JOIN products p ON oi.product_id = p.id 
      WHERE oi.order_id = $1
    `, [orderId]);
    return result.rows;
  },

  create: async (order, db = pool) => {
    const { customer_id, total_amount, status, shipping_address, notes } = order;
    const result = await db.query(
      'INSERT INTO orders (customer_id, total_amount, status, shipping_address) VALUES ($1, $2, $3, $4) RETURNING *',
      [customer_id, total_amount, status, shipping_address]
    );
    
    const createdOrder = result.rows[0];
    
    // Auto-create billing record when order is created
    if (createdOrder) {
      try {
        const invoiceNumber = `INV-${Date.now()}`;
        await db.query(
          `INSERT INTO billing (order_id, customer_id, invoice_number, amount, status, payment_method) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           ON CONFLICT DO NOTHING`,
          [createdOrder.id, customer_id, invoiceNumber, total_amount, 'unpaid', 'cash']
        );
      } catch (error) {
        console.error('Error creating billing record from order:', error);
        // Don't throw - order creation should still succeed even if billing fails
      }
    }
    
    return createdOrder;
  },

  createOrderItem: async (orderItem, db = pool) => {
    const { order_id, product_id, quantity, unit_price } = orderItem;
    const result = await db.query(
      'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4) RETURNING *',
      [order_id, product_id, quantity, unit_price]
    );
    return result.rows[0];
  },

  update: async (id, order, db = pool) => {
    // Get current order to preserve existing values
    const currentOrder = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (!currentOrder.rows[0]) {
      return null;
    }
    
    const current = currentOrder.rows[0];
    const { total_amount, status, shipping_address } = order;
    
    // Build dynamic update object to only update provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    // Only update status if provided
    if (status !== undefined && status !== null) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }
    
    // Only update total_amount if provided
    if (total_amount !== undefined && total_amount !== null) {
      updates.push(`total_amount = $${paramCount}`);
      values.push(total_amount);
      paramCount++;
    }
    
    // Only update shipping_address if provided
    if (shipping_address !== undefined && shipping_address !== null) {
      updates.push(`shipping_address = $${paramCount}`);
      values.push(shipping_address);
      paramCount++;
    }
    
    // Always update the timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Add the id parameter at the end
    values.push(id);
    const idParamCount = paramCount;
    
    if (updates.length === 1) {
      // Only updated_at - no fields to update
      const query = `UPDATE orders SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
      const result = await db.query(query, values);
      return result.rows[0];
    }
    
    const query = `UPDATE orders SET ${updates.join(', ')} WHERE id = $${idParamCount} RETURNING *`;
    const result = await db.query(query, values);
    
    const updatedOrder = result.rows[0];
    
    // Auto-create billing record when order status is marked as completed
    if (status === 'completed' && updatedOrder) {
      try {
        const invoiceNumber = `INV-${Date.now()}`;
        await db.query(
          `INSERT INTO billing (order_id, customer_id, invoice_number, amount, status, payment_method) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           ON CONFLICT DO NOTHING`,
          [id, updatedOrder.customer_id, invoiceNumber, updatedOrder.total_amount, 'unpaid', 'cash']
        );
      } catch (error) {
        console.error('Error creating billing record from order:', error);
        // Don't throw - order update should still succeed even if billing fails
      }
    }
    
    return updatedOrder;
  },

  delete: async (id, db = pool) => {
    try {
      // Delete associated billing records first
      await db.query('DELETE FROM billing WHERE order_id = $1', [id]);
      // Then delete the order
      await db.query('DELETE FROM orders WHERE id = $1', [id]);
    } catch (error) {
      console.error('Error deleting order and billing record:', error);
      throw error;
    }
  },

  getByCustomerId: async (customerId, db = pool) => {
    const result = await db.query('SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC', [customerId]);
    return result.rows;
  },
  updateDeliverySatatus: async (id, updated_at, db = pool) => {
    const result = await db.query(`update billing set status = 'Paid', updated_at = now() where order_id = $1`, [id]);
    return result.rows;
  }

};

module.exports = Order;
