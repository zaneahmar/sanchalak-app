const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const PDFDocument = require('pdfkit');
const tenantAuth = require('../middleware/tenantAuth');
const { masterPool } = require('../config/tenantDb');

// Apply tenant authentication to all routes
router.use(tenantAuth);

// Get billing summary (must come before /:id to avoid matching as ID)
router.get('/summary', async (req, res) => {
  try {
    const result = await req.tenantDb.query(`
      SELECT 
        COUNT(*) as total_invoices,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_paid,
        SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END) as total_unpaid,
        SUM(amount) as total_amount,
        SUM(gst_amount) as total_gst,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'unpaid' THEN 1 END) as unpaid_count
      FROM billing
    `);
    res.json(result.rows[0] || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate GST for an amount
router.post('/calculate-gst', async (req, res) => {
  try {
    const { amount, gst_rate = 18 } = req.body;
    if (!amount) {
      return res.status(400).json({ error: 'amount is required' });
    }

    const gstPercent = gst_rate / 100;
    const subtotal = amount / (1 + gstPercent);
    const gstAmount = amount - subtotal;

    res.json({
      subtotal: parseFloat(subtotal.toFixed(2)),
      gstAmount: parseFloat(gstAmount.toFixed(2)),
      gstRate: gst_rate,
      totalAmount: parseFloat(amount.toFixed(2)),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get billing details (must come before /:id to avoid matching as ID)
router.get('/details/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await req.tenantDb.query(
      `SELECT 
        b.id,
        b.order_id,
        b.sale_id,
        b.customer_id,
        b.invoice_number,
        b.amount,
        CASE 
          WHEN COALESCE(b.subtotal, 0) <= 0 OR COALESCE(b.gst_rate, 0) <= 0
            THEN b.amount / 1.18
          ELSE b.subtotal
        END as subtotal,
        CASE 
          WHEN COALESCE(b.gst_amount, 0) <= 0 OR COALESCE(b.gst_rate, 0) <= 0
            THEN b.amount - (b.amount / 1.18)
          ELSE b.gst_amount
        END as gst_amount,
        CASE WHEN COALESCE(b.gst_rate, 0) <= 0 THEN 18 ELSE b.gst_rate END as gst_rate,
        b.status,
        b.payment_method,
        b.due_date,
        b.created_at,
        b.updated_at,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone
      FROM billing b
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE b.id = $1::integer`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Billing record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download PDF (must come before /:id to avoid matching as ID)
router.get('/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Generating PDF for billing ID:', id);

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

    // Get billing details with order or sale items
    const result = await req.tenantDb.query(
      `SELECT 
        b.id,
        b.invoice_number,
        b.amount,
        b.subtotal,
        b.gst_amount,
        b.gst_rate,
        b.status,
        b.payment_method,
        b.created_at,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        COALESCE(o.id::varchar, b.sale_id) as transaction_id,
        json_agg(json_build_object(
          'product_name', COALESCE(p.name, p2.name),
          'quantity', COALESCE(oi.quantity, si.quantity),
          'unit_price', COALESCE(oi.unit_price, si.unit_price),
          'hsn_code', COALESCE(p.hsn_code, p2.hsn_code)
        )) FILTER (WHERE COALESCE(p.name, p2.name) IS NOT NULL) as items
      FROM billing b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN orders o ON b.order_id = o.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN sale_items si ON b.sale_id = si.sale_id
      LEFT JOIN products p2 ON si.product_id = p2.id
      WHERE b.id = $1::integer
      GROUP BY b.id, b.invoice_number, b.amount, b.status, b.payment_method, b.created_at, c.name, c.email, c.phone, o.id, b.sale_id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Billing record not found' });
    }

    const billing = result.rows[0];
    
    // ================= ENHANCED PROFESSIONAL PDF GENERATION =================
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Setup formatting utilities
    const formatCurrency = (num) => 
      new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    
    // Convert number to words (for Indian currency)
    const numberToWords = (num) => {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      
      if (num === 0) return 'Zero';
      if (num < 0) return 'Minus ' + numberToWords(Math.abs(num));
      
      let words = '';
      const crores = Math.floor(num / 10000000);
      const lakhs = Math.floor((num % 10000000) / 100000);
      const thousands = Math.floor((num % 100000) / 1000);
      const hundreds = Math.floor((num % 1000) / 100);
      const remainder = Math.floor(num % 100);
      
      if (crores > 0) words += numberToWords(crores) + ' Crore ';
      if (lakhs > 0) words += numberToWords(lakhs) + ' Lakh ';
      if (thousands > 0) words += numberToWords(thousands) + ' Thousand ';
      if (hundreds > 0) words += ones[hundreds] + ' Hundred ';
      if (remainder >= 20) {
        words += tens[Math.floor(remainder / 10)] + ' ';
        if (remainder % 10 > 0) words += ones[remainder % 10];
      } else if (remainder >= 10) {
        words += teens[remainder - 10];
      } else if (remainder > 0) {
        words += ones[remainder];
      }
      
      return words.trim();
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${billing.invoice_number}.pdf"`);

    doc.pipe(res);

    // Add watermark for unpaid invoices
    if (billing.status.toLowerCase() === 'unpaid') {
      doc.save();
      doc.rotate(-45, { origin: [300, 420] });
      doc.fontSize(80).fillColor('#ff0000', 0.1).font('Helvetica-Bold')
        .text('UNPAID', 150, 400);
      doc.restore();
    }

    /* ================= HEADER & BRANDING ================= */
    // Top border accent
    doc.rect(0, 0, 595, 8).fill('#2563eb');
    
    // Company Details Section
    doc.fillColor('#1e293b').fontSize(24).font('Helvetica-Bold')
      .text(companyInfo.business_name || companyInfo.name || 'SANCHALAK', 50, 30);
    doc.fontSize(10).fillColor('#64748b').font('Helvetica')
      .text('Wholesale Management System', 50, 58)
      .fontSize(9)
      .text(companyInfo.address || '123, Business Park, Sector 5', 50, 72)
      .text(`${companyInfo.city || 'Mumbai - 400001'}`, 50, 84)
      .text(`Phone: ${companyInfo.phone || '+91 98765 43210'} | Email: ${companyInfo.email || 'contact@sanchalak.com'}`, 50, 96);

    // Tax Registration Box
    doc.roundedRect(380, 30, 165, 28, 3).strokeColor('#cbd5e1').lineWidth(1).stroke();
    doc.fontSize(8).fillColor('#64748b').text('GSTIN:', 390, 36);
    doc.fontSize(10).fillColor('#1e293b').font('Helvetica-Bold')
      .text(companyInfo.gstin || '27ABCDE1234F1Z5', 390, 46);

    // Invoice status badge
    const statusColor = billing.status.toLowerCase() === 'paid' ? '#10b981' : '#f59e0b';
    doc.roundedRect(380, 65, 165, 32, 5).fill(statusColor);
    doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
      .text(billing.status.toUpperCase(), 380, 75, { width: 165, align: 'center' });

    // Divider line
    doc.moveTo(50, 120).lineTo(545, 120).strokeColor('#e2e8f0').lineWidth(2).stroke();

    /* ================= INVOICE TITLE ================= */
    doc.fontSize(18).fillColor('#1e293b').font('Helvetica-Bold').text('TAX INVOICE', 50, 135);

    /* ================= BILL TO & INVOICE INFO ================= */
    let detailsY = 165;
    
    // Bill To Section
    doc.roundedRect(50, detailsY, 240, 85, 3).strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.fontSize(9).fillColor('#64748b').font('Helvetica-Bold').text('BILL TO', 60, detailsY + 10);
    doc.fontSize(11).fillColor('#1e293b').font('Helvetica-Bold')
      .text(billing.customer_name || 'Walk-in Customer', 60, detailsY + 25);
    doc.fontSize(9).fillColor('#475569').font('Helvetica')
      .text(billing.customer_phone || 'N/A', 60, detailsY + 42)
      .text(billing.customer_email || '', 60, detailsY + 56);

    // Invoice Details Section
    doc.roundedRect(305, detailsY, 240, 85, 3).strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.fontSize(9).fillColor('#64748b').font('Helvetica-Bold').text('INVOICE DETAILS', 315, detailsY + 10);
    
    const invDetailsX = 315;
    const invDetailsValX = 440;
    doc.fontSize(9).fillColor('#475569').font('Helvetica')
      .text('Invoice No:', invDetailsX, detailsY + 28)
      .text('Invoice Date:', invDetailsX, detailsY + 43)
      .text('Payment Mode:', invDetailsX, detailsY + 58);
    
    doc.font('Helvetica-Bold').fillColor('#1e293b')
      .text(billing.invoice_number, invDetailsValX, detailsY + 28)
      .text(new Date(billing.created_at).toLocaleDateString('en-IN'), invDetailsValX, detailsY + 43)
      .text((billing.payment_method || 'Cash').toUpperCase(), invDetailsValX, detailsY + 58);

    /* ================= ITEMS TABLE ================= */
    let tableTop = 275;
    const colX = { 
      sno: 55, 
      item: 85, 
      hsn: 280, 
      qty: 340, 
      rate: 390, 
      amount: 480 
    };

    // Table Header with border
    doc.rect(50, tableTop, 495, 25).fill('#1e293b');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text('S.No', colX.sno, tableTop + 8, { width: 25, align: 'center' });
    doc.text('ITEM DESCRIPTION', colX.item, tableTop + 8);
    doc.text('HSN/SAC', colX.hsn, tableTop + 8);
    doc.text('QTY', colX.qty, tableTop + 8, { width: 40, align: 'center' });
    doc.text('RATE', colX.rate, tableTop + 8, { width: 80, align: 'right' });
    doc.text('AMOUNT', colX.amount, tableTop + 8, { width: 60, align: 'right' });

    let y = tableTop + 25;
    doc.fillColor('#334155').font('Helvetica');

    // Draw left and right borders for table
    doc.moveTo(50, tableTop).lineTo(50, tableTop + 25).strokeColor('#1e293b').lineWidth(1).stroke();
    doc.moveTo(545, tableTop).lineTo(545, tableTop + 25).strokeColor('#1e293b').lineWidth(1).stroke();

    let itemSubtotal = 0;
    billing.items?.forEach((item, index) => {
      if (y > 680) { 
        doc.addPage(); 
        y = 50; 
        // Redraw header on new page
        doc.rect(50, y, 495, 25).fill('#1e293b');
        doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
        doc.text('S.No', colX.sno, y + 8, { width: 25, align: 'center' });
        doc.text('ITEM DESCRIPTION', colX.item, y + 8);
        doc.text('HSN/SAC', colX.hsn, y + 8);
        doc.text('QTY', colX.qty, y + 8, { width: 40, align: 'center' });
        doc.text('RATE', colX.rate, y + 8, { width: 80, align: 'right' });
        doc.text('AMOUNT', colX.amount, y + 8, { width: 60, align: 'right' });
        y += 25;
      }
      
      const lineTotal = item.quantity * item.unit_price;
      itemSubtotal += lineTotal;

      // Alternating row colors
      if (index % 2 === 0) {
        doc.rect(50, y, 495, 22).fill('#f8fafc');
      }
      
      // Draw borders
      doc.rect(50, y, 495, 22).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      
      doc.fillColor('#334155').fontSize(9).font('Helvetica');
      doc.text((index + 1).toString(), colX.sno, y + 6, { width: 25, align: 'center' });
      doc.text(item.product_name, colX.item, y + 6, { width: 185, lineBreak: false });
      doc.text(item.hsn_code || 'N/A', colX.hsn, y + 6);
      doc.text(item.quantity.toString(), colX.qty, y + 6, { width: 40, align: 'center' });
      doc.text(`${formatCurrency(item.unit_price)}`, colX.rate, y + 6, { width: 80, align: 'right' });
      doc.font('Helvetica-Bold').text(`${formatCurrency(lineTotal)}`, colX.amount, y + 6, { width: 60, align: 'right' });

      y += 22;
    });

    // Table bottom border
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#1e293b').lineWidth(1).stroke();

    /* ================= TAX BREAKDOWN & SUMMARY SECTION ================= */
    if (y > 620) { doc.addPage(); y = 50; }

    y += 15;
    const subtotal = parseFloat(billing.subtotal) || itemSubtotal;
    const gstAmount = parseFloat(billing.gst_amount) || (subtotal * 0.18);
    const gstRate = parseFloat(billing.gst_rate) || 18;
    const cgst = gstAmount / 2;
    const sgst = gstAmount / 2;
    const totalAmount = parseFloat(billing.amount);

    // Tax Breakdown Box
    doc.roundedRect(50, y, 240, 75, 3).strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.fontSize(9).fillColor('#64748b').font('Helvetica-Bold').text('TAX BREAKDOWN', 60, y + 10);
    doc.fontSize(8).fillColor('#475569').font('Helvetica')
      .text(`CGST (${gstRate/2}%):`, 60, y + 28)
      .text(`SGST (${gstRate/2}%):`, 60, y + 43)
      .text('Total Tax:', 60, y + 58);
    doc.font('Helvetica-Bold')
      .text(`${formatCurrency(cgst)}`, 180, y + 28, { width: 100, align: 'right' })
      .text(`${formatCurrency(sgst)}`, 180, y + 43, { width: 100, align: 'right' })
      .text(`${formatCurrency(gstAmount)}`, 180, y + 58, { width: 100, align: 'right' });

    // Summary Section
    const summaryX = 305;
    const summaryLabelX = 315;
    const summaryValueX = 480;

    doc.roundedRect(summaryX, y, 240, 75, 3).strokeColor('#e2e8f0').lineWidth(1).stroke();
    
    doc.fontSize(9).fillColor('#475569').font('Helvetica')
      .text('Subtotal:', summaryLabelX, y + 12)
      .text(`GST (${gstRate}%):`, summaryLabelX, y + 28);
    
    doc.text(`${formatCurrency(subtotal)}`, summaryValueX, y + 12, { width: 55, align: 'right' })
      .text(`${formatCurrency(gstAmount)}`, summaryValueX, y + 28, { width: 55, align: 'right' });

    // Grand Total - Highlighted
    doc.rect(summaryX, y + 47, 240, 28).fill('#2563eb');
    doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold');
    doc.text('TOTAL AMOUNT:', summaryLabelX, y + 55);
    doc.fontSize(12).text(`${formatCurrency(totalAmount)}`, summaryValueX, y + 54, { width: 55, align: 'right' });

    /* ================= AMOUNT IN WORDS ================= */
    y += 90;
    doc.roundedRect(50, y, 495, 28, 3).strokeColor('#e2e8f0').lineWidth(1).fill('#f8fafc');
    doc.fontSize(9).fillColor('#64748b').font('Helvetica-Bold').text('Amount in Words:', 60, y + 8);
    const amountInWords = numberToWords(Math.floor(totalAmount));
    doc.fontSize(9).fillColor('#1e293b').font('Helvetica-Bold')
      .text(`${amountInWords} Rupees Only`, 165, y + 8);

    /* ================= BANK DETAILS ================= */
    // y += 45;
    // doc.roundedRect(50, y, 240, 75, 3).strokeColor('#e2e8f0').lineWidth(1).stroke();
    // doc.fontSize(9).fillColor('#64748b').font('Helvetica-Bold').text('BANK DETAILS', 60, y + 10);
    // doc.fontSize(8).fillColor('#475569').font('Helvetica')
    //   .text('Bank Name:', 60, y + 25)
    //   .text('A/C No:', 60, y + 38)
    //   .text('IFSC Code:', 60, y + 51)
    //   .text('Branch:', 60, y + 64);
    // doc.font('Helvetica-Bold').fillColor('#1e293b')
    //   .text('State Bank of India', 130, y + 25)
    //   .text('1234567890', 130, y + 38)
    //   .text('SBIN0001234', 130, y + 51)
    //   .text('Mumbai Central', 130, y + 64);

    /* ================= SIGNATURE & STAMP ================= */
    y += 45;
    doc.roundedRect(305, y, 240, 75, 3).strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.fontSize(9).fillColor('#64748b').font('Helvetica')
      .text(`For ${companyInfo.business_name || companyInfo.name || 'SANCHALAK'}`, 315, y + 10);
    doc.fontSize(7).fillColor('#94a3b8').text('Authorized Signatory', 315, y + 60);
    // Signature line
    doc.moveTo(315, y + 55).lineTo(440, y + 55).strokeColor('#cbd5e1').lineWidth(1).stroke();

    /* ================= TERMS & CONDITIONS ================= */
    y += 90;
    if (y > 700) { doc.addPage(); y = 50; }
    
    doc.fontSize(9).fillColor('#64748b').font('Helvetica-Bold').text('TERMS & CONDITIONS:', 50, y);
    doc.fontSize(8).fillColor('#64748b').font('Helvetica')
      .text('1. Goods once sold will not be taken back or exchanged.', 50, y + 15)
      .text('2. All disputes are subject to Mumbai jurisdiction only.', 50, y + 27)
      .text('3. Payment should be made within 7 days from the invoice date.', 50, y + 39)
      .text('4. Interest @18% p.a. will be charged on delayed payments.', 50, y + 51);

    /* ================= FOOTER ================= */
    const footerY = 780;
    doc.rect(0, footerY, 595, 8).fill('#2563eb');
    doc.fontSize(8).fillColor('#64748b').font('Helvetica')
      .text('This is a computer-generated invoice and does not require a physical signature.', 0, footerY - 15, { align: 'center' });
    doc.fontSize(9).fillColor('#1e293b').font('Helvetica-Bold')
      .text('Thank you for your business!', 0, footerY - 30, { align: 'center' });

    doc.end();
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ error: error.message });
    }
});

// Get billing by customer ID (must come before /:id to avoid matching as ID)
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const result = await req.tenantDb.query(
      `SELECT 
        b.id,
        b.order_id,
        b.customer_id,
        b.invoice_number,
        b.amount,
        b.status,
        b.payment_method,
        b.created_at,
        b.updated_at,
        c.name as customer_name
      FROM billing b
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE b.customer_id = $1::integer
      ORDER BY b.created_at DESC`,
      [customerId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all billing records
router.get('/', async (req, res) => {
  try {
    const result = await req.tenantDb.query(`
      SELECT 
        b.id,
        b.order_id,
        b.sale_id,
        b.customer_id,
        b.invoice_number,
        b.amount,
        CASE 
          WHEN COALESCE(b.subtotal, 0) <= 0 OR COALESCE(b.gst_rate, 0) <= 0 
            THEN b.amount / 1.18
          ELSE b.subtotal
        END as subtotal,
        CASE 
          WHEN COALESCE(b.gst_amount, 0) <= 0 OR COALESCE(b.gst_rate, 0) <= 0
            THEN b.amount - (b.amount / 1.18)
          ELSE b.gst_amount
        END as gst_amount,
        CASE WHEN COALESCE(b.gst_rate, 0) <= 0 THEN 18 ELSE b.gst_rate END as gst_rate,
        b.status,
        b.payment_method,
        b.due_date,
        b.created_at,
        b.updated_at,
        c.name AS customer_name
      FROM billing b
      LEFT JOIN customers c ON b.customer_id = c.id
      ORDER BY b.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get billing by ID (generic route - must come last)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await req.tenantDb.query(
      `SELECT 
        b.id,
        b.order_id,
        b.sale_id,
        b.customer_id,
        b.invoice_number,
        b.amount,
        CASE 
          WHEN COALESCE(b.subtotal, 0) <= 0 OR COALESCE(b.gst_rate, 0) <= 0
            THEN b.amount / 1.18
          ELSE b.subtotal
        END as subtotal,
        CASE 
          WHEN COALESCE(b.gst_amount, 0) <= 0 OR COALESCE(b.gst_rate, 0) <= 0
            THEN b.amount - (b.amount / 1.18)
          ELSE b.gst_amount
        END as gst_amount,
        CASE WHEN COALESCE(b.gst_rate, 0) <= 0 THEN 18 ELSE b.gst_rate END as gst_rate,
        b.status,
        b.payment_method,
        b.created_at,
        b.updated_at,
        c.name as customer_name
      FROM billing b
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE b.id = $1::integer`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Billing record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Create billing record
router.post('/', async (req, res) => {
  try {
    const { order_id, customer_id, invoice_number, amount, status, payment_method } = req.body;

    if (!invoice_number || !amount) {
      return res.status(400).json({ error: 'invoice_number and amount are required' });
    }

    const result = await req.tenantDb.query(
      `INSERT INTO billing (order_id, customer_id, invoice_number, amount, status, payment_method, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [order_id || null, customer_id || null, invoice_number, amount, status || 'unpaid', payment_method || 'cash']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update billing record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_method, amount } = req.body;

    let query = `UPDATE billing SET updated_at = NOW()`;
    let params = [];
    let paramCount = 1;

    if (status !== undefined) {
      query += `, status = $${paramCount++}`;
      params.push(status);
    }

    if (payment_method !== undefined) {
      query += `, payment_method = $${paramCount++}`;
      params.push(payment_method);
    }

    if (amount !== undefined) {
      query += `, amount = $${paramCount++}`;
      params.push(amount);
    }

    query += ` WHERE id = $${paramCount}`;
    params.push(id);

    query += ` RETURNING *`;

    const result = await req.tenantDb.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Billing record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete billing record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await req.tenantDb.query(
      `DELETE FROM billing WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Billing record not found' });
    }

    res.json({ message: 'Billing record deleted successfully', billing: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
