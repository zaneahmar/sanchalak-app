const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const PDFDocument = require('pdfkit');
const DebitCreditNote = require('../models/DebitCreditNote');
const tokenExpiry = require('../middleware/tokenExpiry');
const tenantAuth = require('../middleware/tenantAuth');
const { masterPool } = require('../config/tenantDb');

// Apply token expiry and tenant authentication to all routes
router.use(tokenExpiry);
router.use(tenantAuth);

// Get all sales with items
router.get('/', async (req, res) => {
  try {
    const result = await req.tenantDb.query(`
      SELECT 
        s.id,
        s.customer_id,
        s.subtotal,
        s.gst_percentage,
        s.gst_amount,
        s.total_amount,
        s.payment_method,
        s.notes,
        s.sale_date,
        s.due_date,
        s.created_at,
        c.name as customer_name,
        json_agg(json_build_object(
          'id', si.id,
          'product_id', si.product_id,
          'product_name', p.name,
          'quantity', si.quantity,
          'unit_price', si.unit_price,
          'cost', p.cost
        )) as items
      FROM sales s 
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      GROUP BY s.id, s.customer_id, s.subtotal, s.gst_percentage, s.gst_amount, s.total_amount, s.payment_method, s.notes, s.sale_date, s.due_date, s.created_at, c.name
      ORDER BY s.sale_date DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sales by date range
router.get('/date-range', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const result = await req.tenantDb.query(
      `SELECT 
        s.id,
        s.customer_id,
        s.total_amount,
        s.payment_method,
        s.notes,
        s.sale_date,
        s.due_date,
        s.created_at,
        json_agg(json_build_object(
          'product_id', si.product_id,
          'product_name', p.name,
          'quantity', si.quantity,
          'unit_price', si.unit_price,
          'cost', p.cost
        )) as items
       FROM sales s 
       LEFT JOIN sale_items si ON s.id = si.sale_id
       LEFT JOIN products p ON si.product_id = p.id
       WHERE s.sale_date BETWEEN $1 AND $2 
       GROUP BY s.id, s.customer_id, s.total_amount, s.payment_method, s.notes, s.sale_date, s.due_date, s.created_at
       ORDER BY s.sale_date DESC`,
      [startDate, endDate]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sales summary
router.get('/summary', async (req, res) => {
  try {
    const result = await req.tenantDb.query(`
      SELECT 
        COUNT(*) as total_sales,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_sale,
        MAX(total_amount) as highest_sale
      FROM sales
    `);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get sales details with items
    const result = await req.tenantDb.query(
      `SELECT 
        s.id,
        s.customer_id,
        s.subtotal,
        s.gst_percentage,
        s.gst_amount,
        s.total_amount,
        s.payment_method,
        s.notes,
        s.sale_date,
        s.due_date,
        s.created_at,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        json_agg(json_build_object(
          'id', si.id,
          'product_id', si.product_id,
          'product_name', p.name,
          'quantity', si.quantity,
          'unit_price', si.unit_price,
          'hsn_code', p.hsn_code
        )) as items
      FROM sales s 
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE s.id = $1
      GROUP BY s.id, s.customer_id, s.total_amount, s.payment_method, s.notes, s.sale_date, s.due_date, s.created_at, c.name, c.email, c.phone,s.subtotal, s.gst_percentage, s.gst_amount`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    const sale = result.rows[0];
    // Filter out null items that occur when there are no sale items
    if (sale && sale.items && sale.items[0] && sale.items[0].product_id === null) {
      sale.items = [];
    }
    res.json(sale);

  }catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download PDF invoice for a sale
router.get('/download/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get sales details with items
    const result = await req.tenantDb.query(
      `SELECT 
        s.id,
        s.customer_id,
        s.subtotal,
        s.gst_percentage,
        s.gst_amount,
        s.total_amount,
        s.payment_method,
        s.notes,
        s.sale_date,
        s.due_date,
        s.created_at,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        json_agg(json_build_object(
          'id', si.id,
          'product_id', si.product_id,
          'product_name', p.name,
          'quantity', si.quantity,
          'unit_price', si.unit_price,
          'hsn_code', p.hsn_code
        )) as items
      FROM sales s 
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE s.id = $1
      GROUP BY s.id, s.customer_id, s.subtotal, s.gst_percentage, s.gst_amount, s.total_amount, s.payment_method, s.notes, s.sale_date, s.due_date, s.created_at, c.name, c.email, c.phone`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    let sale = result.rows[0];
    // Filter out null items that occur when there are no sale items
    if (sale && sale.items && sale.items[0] && sale.items[0].product_id === null) {
      sale.items = [];
    }
    
    // Get user/company details from master database using user ID from req.user
    const userResult = await masterPool.query(
      `SELECT name, business_name, address, city, phone, email, gstin 
       FROM user_master 
       WHERE id = $1 AND is_active = true`,
      [req.user.id]
    );
    
    const companyInfo = userResult.rows.length > 0 ? userResult.rows[0] : {
      name: 'Sanchalak Business Solutions',
      business_name: 'Sanchalak Business Solutions',
      address: '123, Business Park, Sector 5',
      city: 'Mumbai - 400001',
      phone: '+91 98765 43210',
      email: 'contact@sanchalak.com',
      gstin: '27ABCDE1234F1Z5'
    };
    
    // Use actual GST rate from sale record
    const gstRate = parseFloat(sale.gst_percentage) || 18;
    const subtotal = parseFloat(sale.subtotal) || parseFloat(sale.total_amount) / (1 + gstRate / 100);
    const gstAmount = parseFloat(sale.gst_amount) || (parseFloat(sale.total_amount) - subtotal);
    const totalAmount = parseFloat(sale.total_amount);

    // Create PDF document
    const doc = new PDFDocument({ margin: 40 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${sale.id}.pdf"`);
    
    // Pipe PDF to response
    doc.pipe(res);

    // Header - Company Name and Logo Area
    doc.fontSize(24).font('Helvetica-Bold').text(companyInfo.business_name || companyInfo.name || 'Sanchalak', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Wholesale Management System', { align: 'center' });
    doc.moveDown(0.5);
    
    // Horizontal line
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);
    
    // Invoice title and info in two columns
    doc.fontSize(16).font('Helvetica-Bold').text('INVOICE', 40, doc.y);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Invoice #: ${sale.id}`, 350, 100);
    doc.text(`Date: ${new Date(sale.sale_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`, 350, 120);
    doc.moveDown(2);
    
    // Bill To Section
    doc.fontSize(11).font('Helvetica-Bold').text('BILL TO:', 40, doc.y);
    doc.fontSize(10).font('Helvetica');
    doc.text(sale.customer_name || 'Walk-in Customer', 40, doc.y);
    if (sale.customer_email) {
      doc.text(`Email: ${sale.customer_email}`, 40, doc.y);
    }
    if (sale.customer_phone) {
      doc.text(`Phone: ${sale.customer_phone}`, 40, doc.y);
    }
    
    doc.moveDown(1.5);
    
    // Items Table Header
    const itemStartY = doc.y;
    const colWidths = { item: 180, hsn: 60, qty: 60, price: 70, amount: 90 };
    const colX = { item: 40, hsn: 220, qty: 280, price: 340, amount: 410 };
    
    doc.rect(colX.item - 5, itemStartY - 5, 525, 20).fill('#f0f0f0');
    doc.fillColor('black');
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Item Description', colX.item, itemStartY);
    doc.text('HSN', colX.hsn, itemStartY);
    doc.text('Qty', colX.qty, itemStartY);
    doc.text('Unit Price', colX.price, itemStartY);
    doc.text('Amount', colX.amount, itemStartY);
    
    doc.font('Helvetica');
    doc.moveTo(40, doc.y + 5).lineTo(540, doc.y + 5).stroke();
    doc.moveDown(0.5);
    
    // Items rows
    let itemTotal = 0;
    if (sale.items && sale.items.length > 0) {
      sale.items.forEach((item) => {
        if (item.product_name) {
          const amount = item.quantity * item.unit_price;
          itemTotal += amount;
          
          doc.fontSize(9);
          doc.text(item.product_name, colX.item, doc.y, { width: colWidths.item - 10 });
          doc.text(item.hsn_code || 'N/A', colX.hsn, doc.y - doc.heightOfString(item.product_name));
          doc.text(item.quantity.toString(), colX.qty, doc.y - doc.heightOfString(item.product_name));
          doc.text(`${parseFloat(item.unit_price).toFixed(2)}`, colX.price, doc.y - doc.heightOfString(item.product_name));
          doc.text(`${amount.toFixed(2)}`, colX.amount, doc.y - doc.heightOfString(item.product_name));
          doc.moveDown(0.8);
        }
      });
    }
    
    // Summary section
    doc.moveDown(0.5);
    doc.moveTo(350, doc.y).lineTo(540, doc.y).stroke();
    doc.moveDown(0.5);
    
    const summaryX = 350;
    const summaryLabelX = 350;
    const summaryValueX = 450;
    
    doc.fontSize(10);
    doc.text('Subtotal:', summaryLabelX, doc.y, { width: 100 });
    doc.text(`${subtotal.toFixed(2)}`, summaryValueX, doc.y - 10, { align: 'right' });
    doc.moveDown(0.5);
    
    doc.text(`GST (${gstRate}%):`, summaryLabelX, doc.y, { width: 100 });
    doc.text(`${gstAmount.toFixed(2)}`, summaryValueX, doc.y - 10, { align: 'right' });
    doc.moveDown(0.5);
    
    doc.moveTo(350, doc.y).lineTo(540, doc.y).stroke();
    
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Total Amount:', summaryLabelX, doc.y + 5, { width: 100 });
    doc.text(`${totalAmount.toFixed(2)}`, summaryValueX, doc.y + 5, { align: 'right' });
    
    doc.moveDown(1.5);
    doc.font('Helvetica');
    doc.fontSize(10);
    doc.text(`Payment Method: ${sale.payment_method.toUpperCase()}`, 40, doc.y);
    
    if (sale.notes) {
      doc.moveDown(0.5);
      doc.text(`Notes: ${sale.notes}`, 40, doc.y);
    }
    
    // Footer
    doc.moveDown(2);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).text('Thank you for your business! GST included in the total amount.', 40, doc.y, { align: 'center' });

    // End document
    doc.end();
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create sale (supports both single product and multiple items)
router.post('/', async (req, res) => {
  try {
    const { order_id, product_id, quantity, unit_price, total_amount, customerId, items, paymentMethod, notes, totalAmount, gstPercentage, subtotal, saleDate, dueDate } = req.body;
    
    // Use either totalAmount or total_amount from frontend
    const finalTotalAmount = totalAmount || total_amount;
    
    // Calculate GST
    const gstPercentageValue = parseFloat(gstPercentage) || 0;
    const subtotalValue = parseFloat(subtotal) || 0;
    const gstAmountValue = (subtotalValue * gstPercentageValue) / 100;
    
    // Handle multiple items format (from frontend)
    if (items && Array.isArray(items) && items.length > 0) {
      const saleId = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const saleItems = [];
      
      try {
        // Insert main sale record
        const saleResult = await req.tenantDb.query(
          `INSERT INTO sales (id, customer_id, subtotal, gst_percentage, gst_amount, total_amount, payment_method, notes, sale_date, due_date) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
           RETURNING *`,
          [saleId, customerId || null, subtotalValue, gstPercentageValue, gstAmountValue, finalTotalAmount || 0, paymentMethod || 'cash', notes || '', saleDate || new Date().toISOString(), dueDate || null]
        );
        
        // Insert each sale item
        for (const item of items) {
          const itemResult = await req.tenantDb.query(
            `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [saleId, item.productId, item.quantity, item.price]
          );
          saleItems.push(itemResult.rows[0]);
          
          // Update inventory stock
          await req.tenantDb.query(
            `UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2`,
            [item.quantity, item.productId]
          );
        }
        
        // Auto-create billing record for the sale
        let billingId = null;
        try {
          const invoiceNumber = `INV-${Date.now()}`;
          const billingResult = await req.tenantDb.query(
            `INSERT INTO billing (sale_id, customer_id, invoice_number, amount, subtotal, gst_amount, gst_rate, status, payment_method, due_date) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id`,
            [saleId, customerId || null, invoiceNumber, finalTotalAmount || 0, subtotalValue, gstAmountValue, gstPercentageValue, 'unpaid', paymentMethod || 'cash', dueDate || null]
          );
          billingId = billingResult.rows[0]?.id;
        } catch (billingError) {
          console.error('Error creating billing record from sale:', billingError);
          // Don't throw - sale should still succeed even if billing fails
        }
 
        // Fetch the complete sale with items including product names (for consistency with GET /:id endpoint)
        const fullSaleResult = await req.tenantDb.query(`
          SELECT 
            s.id,
            s.customer_id,
            s.subtotal,
            s.gst_percentage,
            s.gst_amount,
            s.total_amount,
            s.payment_method,
            s.notes,
            s.sale_date,
            s.due_date,
            s.created_at,
            c.name as customer_name,
            json_agg(json_build_object(
              'id', si.id,
              'product_id', si.product_id,
              'product_name', p.name,
              'quantity', si.quantity,
              'unit_price', si.unit_price,
              'hsn_code', p.hsn_code
            )) as items
          FROM sales s 
          LEFT JOIN customers c ON s.customer_id = c.id
          LEFT JOIN sale_items si ON s.id = si.sale_id
          LEFT JOIN products p ON si.product_id = p.id
          WHERE s.id = $1
          GROUP BY s.id, s.customer_id, s.subtotal, s.gst_percentage, s.gst_amount, s.total_amount, s.payment_method, s.notes, s.sale_date, s.due_date, s.created_at, c.name
        `, [saleId]);
        
        const completeSale = fullSaleResult.rows[0];
        // Filter out null items that occur when there are no sale items
        if (completeSale && completeSale.items && completeSale.items[0] && completeSale.items[0].product_id === null) {
          completeSale.items = [];
        }
        
        return res.status(201).json(completeSale);
      } catch (error) {
        throw error;
      }
    }
    
    // Handle single item format (legacy)
    if (!product_id || !quantity || !unit_price || !finalTotalAmount) {
      return res.status(400).json({ error: 'Missing required fields. Provide either single product or items array.' });
    }

    const result = await req.tenantDb.query(
      `INSERT INTO sales (order_id, product_id, quantity, unit_price, total_amount) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [order_id, product_id, quantity, unit_price, finalTotalAmount]
    );
    
    // Auto-create billing record for single item sale
    try {
      const invoiceNumber = `INV-${Date.now()}`;
      const saleIdLegacy = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await req.tenantDb.query(
        `INSERT INTO billing (sale_id, customer_id, invoice_number, amount, subtotal, gst_amount, gst_rate, status, payment_method) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [saleIdLegacy, customerId || null, invoiceNumber, finalTotalAmount, subtotalValue, gstAmountValue, gstPercentageValue, 'unpaid', paymentMethod || 'cash']
      );
    } catch (billingError) {
      console.error('Error creating billing record from sale:', billingError);
      // Don't throw
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update sale
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customerId, items, subtotal, gstPercentage, gstAmount, totalAmount, paymentMethod, notes, saleDate, dueDate } = req.body;
    
    // Get the original sale to compare items
    const originalSaleResult = await req.tenantDb.query(
      `SELECT * FROM sales WHERE id = $1`,
      [id]
    );
    
    if (originalSaleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    const originalSale = originalSaleResult.rows[0];
    
    // Get original sale items
    const originalItemsResult = await req.tenantDb.query(
      `SELECT product_id, quantity FROM sale_items WHERE sale_id = $1`,
      [id]
    );
    
    // Restore original inventory
    for (const item of originalItemsResult.rows) {
      await req.tenantDb.query(
        `UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }
    
    // Delete old sale items
    await req.tenantDb.query(
      `DELETE FROM sale_items WHERE sale_id = $1`,
      [id]
    );
    
    // Insert new sale items and deduct inventory
    for (const item of items) {
      await req.tenantDb.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) 
         VALUES ($1, $2, $3, $4)`,
        [id, item.productId, item.quantity, item.price]
      );
      
      // Deduct inventory
      await req.tenantDb.query(
        `UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2`,
        [item.quantity, item.productId]
      );
    }
    
    // Update sale record
    const finalTotalAmount = totalAmount;
    const gstPercentageValue = parseFloat(gstPercentage) || 0;
    const subtotalValue = parseFloat(subtotal) || 0;
    const gstAmountValue = parseFloat(gstAmount) || 0;
    
    const updateResult = await req.tenantDb.query(
      `UPDATE sales 
       SET customer_id = $1, subtotal = $2, gst_percentage = $3, gst_amount = $4, total_amount = $5, payment_method = $6, notes = $7, sale_date = $8, due_date = $9
       WHERE id = $10
       RETURNING *`,
      [customerId || null, subtotalValue, gstPercentageValue, gstAmountValue, finalTotalAmount, paymentMethod, notes, saleDate || new Date().toISOString(), dueDate || null, id]
    );
    
    // Update billing record
    try {
      await req.tenantDb.query(
        `UPDATE billing SET amount = $1, payment_method = $2, subtotal = $3, gst_amount = $4, gst_rate = $5 WHERE sale_id = $6`,
        [finalTotalAmount, paymentMethod, subtotalValue, gstAmountValue, gstPercentageValue, id]
      );
    } catch (billingError) {
      console.error('Error updating billing record:', billingError);
    }
    
    // Note: Sales are tracked in billing table, not in customer_balance
    // customer_balance only tracks debit/credit notes
    
    // Fetch the updated sale with items to return to client
    const fullSaleResult = await req.tenantDb.query(`
      SELECT 
        s.id,
        s.customer_id,
        s.subtotal,
        s.gst_percentage,
        s.gst_amount,
        s.total_amount,
        s.payment_method,
        s.notes,
        s.sale_date,
        s.due_date,
        s.created_at,
        c.name as customer_name,
        json_agg(json_build_object(
          'id', si.id,
          'product_id', si.product_id,
          'product_name', p.name,
          'quantity', si.quantity,
          'unit_price', si.unit_price,
          'cost', p.cost
        )) as items
      FROM sales s 
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE s.id = $1
      GROUP BY s.id, s.customer_id, s.subtotal, s.gst_percentage, s.gst_amount, s.total_amount, s.payment_method, s.notes, s.sale_date, s.due_date, s.created_at, c.name
    `, [id]);
    
    const updatedSaleWithItems = fullSaleResult.rows[0] || updateResult.rows[0];
    res.json({ message: 'Sale updated successfully', sale: updatedSaleWithItems });
  } catch (error) {
    console.error('Error updating sale:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete sale
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the sale items to restore inventory
    const saleItemsResult = await req.tenantDb.query(
      `SELECT product_id, quantity FROM sale_items WHERE sale_id = $1`,
      [id]
    );
    
    // Restore inventory for each item
    for (const item of saleItemsResult.rows) {
      await req.tenantDb.query(
        `UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }
    
    // Delete sale items first
    await req.tenantDb.query(
      `DELETE FROM sale_items WHERE sale_id = $1`,
      [id]
    );
    
    // Get sale info before deleting
    const saleInfo = await req.tenantDb.query(
      `SELECT customer_id, total_amount FROM sales WHERE id = $1`,
      [id]
    );
    const saleData = saleInfo.rows[0];
    
    // Delete associated billing record
    await req.tenantDb.query(
      `DELETE FROM billing WHERE sale_id = $1`,
      [id]
    );

    // Note: Sales are tracked in billing table, not in customer_balance
    // customer_balance only tracks debit/credit notes
    
    // Delete the sale
    const result = await req.tenantDb.query(
      `DELETE FROM sales WHERE id = $1 RETURNING *`,
      [id]
    );

    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    res.json({ message: 'Sale deleted successfully', sale: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
