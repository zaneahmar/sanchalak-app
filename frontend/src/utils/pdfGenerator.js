import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * PDF Generator for Financial Reports
 * Creates market-standard PDF documents with professional formatting
 */

// Default company information - will be replaced by user data
const DEFAULT_COMPANY_INFO = {
  name: 'Sanchalak Business Solutions',
  business_name: 'Sanchalak Business Solutions',
  address: 'Business Address Line 1',
  city: 'City, State - PIN Code',
  phone: 'Phone: +91 XXXXXXXXXX',
  email: 'Email: info@sanchalak.com',
  gstin: 'GSTIN: XXXXXXXXXXXX'
};

/**
 * Get company info from logged-in user or use defaults
 */
const getCompanyInfo = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      console.log('User data from localStorage:', user);
      // Always prioritize business_name for display
      const displayName = user.business_name || user.name || DEFAULT_COMPANY_INFO.business_name;
      console.log('Using display name:', displayName, '(business_name:', user.business_name, ', name:', user.name, ')');
      return {
        name: displayName,
        business_name: displayName,
        address: user.address || DEFAULT_COMPANY_INFO.address,
        city: user.city || DEFAULT_COMPANY_INFO.city,
        phone: user.phone ? `Phone: ${user.phone}` : DEFAULT_COMPANY_INFO.phone,
        email: user.email ? `Email: ${user.email}` : DEFAULT_COMPANY_INFO.email,
        gstin: user.gstin ? `GSTIN: ${user.gstin}` : DEFAULT_COMPANY_INFO.gstin
      };
    }
  } catch (error) {
    console.error('Error getting user data for PDF:', error);
  }
  return DEFAULT_COMPANY_INFO;
};

// Color scheme for professional PDF
const COLORS = {
  primary: [102, 126, 234],      // #667EEA
  secondary: [118, 75, 162],      // #764BA2
  text: [26, 32, 44],             // #1A202C
  lightGray: [226, 232, 240],     // #E2E8F0
  success: [72, 187, 120],        // #48BB78
  danger: [245, 101, 101],        // #F56565
  warning: [237, 137, 54]         // #ED8936
};

/**
 * Add header to PDF with company branding
 */
const addHeader = (doc, title, subtitle = '') => {
  const pageWidth = doc.internal.pageSize.width;
  const COMPANY_INFO = getCompanyInfo();
  
  // Header background with gradient effect
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Logo placeholder (circle)
  doc.setFillColor(255, 255, 255);
  doc.circle(20, 15, 8, 'F');
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${COMPANY_INFO.name.split(' ')[0]}`, 20, 16, { align: 'center' });
  
  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_INFO.name, 35, 12);
  
  // Company tagline/address
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_INFO.address, 35, 18);
  doc.text(`${COMPANY_INFO.phone} | ${COMPANY_INFO.email}`, 35, 23);
  
  // Report title (right side)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth - 15, 12, { align: 'right' });
  
  // Subtitle (date range, etc.)
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, pageWidth - 15, 19, { align: 'right' });
  }
  
  // Generation timestamp
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generated: ${dateStr} at ${timeStr}`, pageWidth - 15, 26, { align: 'right' });
  
  // Decorative line
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.line(15, 32, pageWidth - 15, 32);
  
  // Report ID
  const reportId = `RPT-${Date.now().toString().slice(-8)}`;
  doc.setFontSize(7);
  doc.text(`Report ID: ${reportId}`, 15, 37);
  doc.text('CONFIDENTIAL', pageWidth - 15, 37, { align: 'right' });
  
  return 55; // Return Y position after header
};

/**
 * Add footer with page numbers and company info
 */
const addFooter = (doc) => {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const pageCount = doc.internal.pages.length - 1;
  const COMPANY_INFO = getCompanyInfo();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer separator line
    doc.setDrawColor(...COLORS.lightGray);
    doc.setLineWidth(0.5);
    doc.line(15, pageHeight - 25, pageWidth - 15, pageHeight - 25);
    
    // Company info (left side)
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(COMPANY_INFO.business_name, 15, pageHeight - 19);
    doc.text(`${COMPANY_INFO.phone} | ${COMPANY_INFO.email}`, 15, pageHeight - 15);
    doc.text(`${COMPANY_INFO.gstin}`, 15, pageHeight - 11);
    
    // Page number (center)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
    
    // Confidentiality notice (right side)
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('This report is confidential and', pageWidth - 15, pageHeight - 19, { align: 'right' });
    doc.text('intended for internal use only', pageWidth - 15, pageHeight - 15, { align: 'right' });
    doc.text('© 2026 All Rights Reserved', pageWidth - 15, pageHeight - 11, { align: 'right' });
  }
};

/**
 * Add signature section for authorized reports
 */
const addSignatureSection = (doc, startY) => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Check if we need a new page
  if (startY > pageHeight - 70) {
    doc.addPage();
    startY = 20;
  }
  
  // Section title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Report Authorization', 15, startY);
  
  // Signature boxes
  const boxWidth = (pageWidth - 50) / 3;
  const boxY = startY + 10;
  
  // Prepared by
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Prepared By:', 15, boxY);
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.3);
  doc.line(15, boxY + 20, 15 + boxWidth - 5, boxY + 20);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('Signature & Date', 15, boxY + 25);
  
  // Reviewed by
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text);
  doc.text('Reviewed By:', 20 + boxWidth, boxY);
  doc.line(20 + boxWidth, boxY + 20, 20 + boxWidth * 2 - 5, boxY + 20);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('Signature & Date', 20 + boxWidth, boxY + 25);
  
  // Approved by
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text);
  doc.text('Approved By:', 25 + boxWidth * 2, boxY);
  doc.line(25 + boxWidth * 2, boxY + 20, pageWidth - 15, boxY + 20);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('Signature & Date', 25 + boxWidth * 2, boxY + 25);
  
  return boxY + 30;
};

/**
 * Generate Profit & Loss Statement PDF
 */
export const generateProfitLossPDF = (data, startDate, endDate) => {
  const doc = new jsPDF();
  
  // Add header
  const startY = addHeader(
    doc, 
    'Profit & Loss Statement',
    `Period: ${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')}`
  );
  
  // Summary cards section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Financial Summary', 15, startY + 5);
  
  // Create summary table
  const summaryData = [
    ['Total Revenue', `Rs. ${data.revenue?.totalRevenue?.toFixed(2) || 0}`],
    ['Collected Revenue', `Rs. ${data.revenue?.collectedRevenue?.toFixed(2) || 0}`],
    ['Cost of Goods Sold', `Rs. ${data.costOfGoodsSold?.toFixed(2) || 0}`],
    ['Gross Profit', `Rs. ${data.grossProfit?.toFixed(2) || 0}`],
    ['Gross Profit Margin', `${data.grossProfitMargin || 0}%`],
    ['GST Collected', `Rs. ${data.gstCollected?.toFixed(2) || 0}`]
  ];
  
  autoTable(doc, {
    startY: startY + 10,
    head: [['Description', 'Amount']],
    body: summaryData,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 11
    },
    bodyStyles: {
      fontSize: 10,
      textColor: COLORS.text
    },
    alternateRowStyles: {
      fillColor: [248, 249, 255]
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'normal' },
      1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });
  
  // Highlight profit row
  const finalY = doc.lastAutoTable?.finalY || startY + 100;
  
  // Add key insights section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Key Insights', 15, finalY + 15);
  
  // Calculate insights
  const profitMargin = data.grossProfitMargin || 0;
  const collectionRate = data.revenue?.totalRevenue > 0 
    ? ((data.revenue?.collectedRevenue / data.revenue?.totalRevenue) * 100).toFixed(1)
    : 0;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  const insights = [
    `• Gross Profit Margin: ${profitMargin}% - ${profitMargin > 30 ? 'Excellent' : profitMargin > 20 ? 'Good' : profitMargin > 10 ? 'Fair' : 'Needs Improvement'}`,
    `• Collection Rate: ${collectionRate}% of total revenue has been collected`,
    `• Outstanding Amount: Rs. ${((data.revenue?.totalRevenue || 0) - (data.revenue?.collectedRevenue || 0)).toFixed(2)} pending`,
    `• Cost Ratio: ${data.revenue?.totalRevenue > 0 ? ((data.costOfGoodsSold / data.revenue?.totalRevenue) * 100).toFixed(1) : 0}% of revenue spent on goods`
  ];
  
  let insightY = finalY + 22;
  insights.forEach(insight => {
    doc.text(insight, 15, insightY);
    insightY += 6;
  });
  
  // Add notes section
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Note: This report provides a comprehensive overview of income and expenses for the specified period.', 15, insightY + 5);
  doc.text('All figures are in Indian Rupees (INR). GST amounts are calculated based on applicable rates.', 15, insightY + 10);
  
  // Add signature section
  const sigY = addSignatureSection(doc, insightY + 20);
  
  // Add footer
  addFooter(doc);
  
  // Open print dialog
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};

/**
 * Generate Balance Sheet PDF
 */
export const generateBalanceSheetPDF = (data) => {
  const doc = new jsPDF();
  
  // Add header
  const startY = addHeader(doc, 'Balance Sheet', `As of ${new Date().toLocaleDateString('en-IN')}`);
  
  let currentY = startY + 5;
  
  // Assets section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Assets', 15, currentY);
  
  const assetsData = [
    ['Cash', `Rs. ${data.assets?.cash?.toFixed(2) || 0}`],
    ['Accounts Receivable', `Rs. ${data.assets?.accountsReceivable?.toFixed(2) || 0}`],
    ['Inventory', `Rs. ${data.assets?.inventory?.toFixed(2) || 0}`],
    ['Total Assets', `Rs. ${data.assets?.totalAssets?.toFixed(2) || 0}`]
  ];
  
  autoTable(doc, {
    startY: currentY + 5,
    body: assetsData,
    theme: 'plain',
    bodyStyles: {
      fontSize: 10,
      textColor: COLORS.text
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'normal' },
      1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.row.index === assetsData.length - 1) {
        data.cell.styles.fillColor = COLORS.lightGray;
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });
  
  currentY = doc.lastAutoTable?.finalY + 10 || currentY + 50;
  
  // Liabilities section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Liabilities', 15, currentY);
  
  const liabilitiesData = [
    ['Accounts Payable', `Rs. ${data.liabilities?.accountsPayable?.toFixed(2) || 0}`],
    ['Total Liabilities', `Rs. ${data.liabilities?.totalLiabilities?.toFixed(2) || 0}`]
  ];
  
  autoTable(doc, {
    startY: currentY + 5,
    body: liabilitiesData,
    theme: 'plain',
    bodyStyles: {
      fontSize: 10,
      textColor: COLORS.text
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'normal' },
      1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.row.index === liabilitiesData.length - 1) {
        data.cell.styles.fillColor = COLORS.lightGray;
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });
  
  currentY = doc.lastAutoTable?.finalY + 10 || currentY + 40;
  
  // Equity section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Equity', 15, currentY);
  
  const equityData = [
    ['Total Equity', `Rs. ${data.equity?.toFixed(2) || 0}`]
  ];
  
  autoTable(doc, {
    startY: currentY + 5,
    body: equityData,
    theme: 'plain',
    bodyStyles: {
      fontSize: 10,
      textColor: COLORS.text,
      fillColor: COLORS.lightGray,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 60, halign: 'right' }
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });
  
  // Add financial health indicator
  const finalY = doc.lastAutoTable?.finalY + 15 || currentY + 50;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Financial Health Indicators', 15, finalY);
  
  // Calculate ratios
  const currentRatio = data.liabilities?.totalLiabilities > 0
    ? (data.assets?.totalAssets / data.liabilities?.totalLiabilities).toFixed(2)
    : 'N/A';
  const debtToEquity = data.equity > 0
    ? (data.liabilities?.totalLiabilities / data.equity).toFixed(2)
    : 'N/A';
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  const indicators = [
    `• Current Ratio: ${currentRatio} ${currentRatio > 1.5 ? '(Healthy)' : currentRatio > 1 ? '(Acceptable)' : '(Review Required)'}`,
    `• Debt-to-Equity Ratio: ${debtToEquity}`,
    `• Net Worth: Rs. ${data.equity?.toFixed(2) || 0}`,
    `• Liquidity: Cash represents ${data.assets?.totalAssets > 0 ? ((data.assets?.cash / data.assets?.totalAssets) * 100).toFixed(1) : 0}% of total assets`
  ];
  
  let indicatorY = finalY + 7;
  indicators.forEach(indicator => {
    doc.text(indicator, 15, indicatorY);
    indicatorY += 6;
  });
  
  // Add formula note
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Note: Current Ratio = Total Assets / Total Liabilities | Debt-to-Equity = Total Liabilities / Equity', 15, indicatorY + 5);
  
  // Add signature section
  const sigY = addSignatureSection(doc, indicatorY + 15);
  
  // Add footer
  addFooter(doc);
  
  // Open print dialog
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};

/**
 * Generate Sales Report PDF
 */
export const generateSalesReportPDF = (data, startDate, endDate) => {
  const doc = new jsPDF();
  
  // Add header
  const startY = addHeader(
    doc, 
    'Sales Report',
    `Period: ${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')}`
  );
  
  // Summary section
  const totalOrders = data.reduce((sum, row) => sum + (parseInt(row.orders) || 0), 0);
  const totalItems = data.reduce((sum, row) => sum + (parseInt(row.items_sold) || 0), 0);
  const totalRevenue = data.reduce((sum, row) => sum + (parseFloat(row.daily_revenue) || 0), 0);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Sales Summary', 15, startY + 5);
  
  const summaryData = [
    ['Total Orders', totalOrders.toString()],
    ['Items Sold', totalItems.toString()],
    ['Total Revenue', `Rs. ${totalRevenue.toFixed(2)}`]
  ];
  
  autoTable(doc, {
    startY: startY + 10,
    body: summaryData,
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.primary
    },
    bodyStyles: {
      fontSize: 10,
      textColor: COLORS.text,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 60, halign: 'right' }
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });
  
  const detailStartY = doc.lastAutoTable?.finalY + 10 || startY + 60;
  
  // Detailed sales data
  doc.setFontSize(12);
  doc.text('Daily Breakdown', 15, detailStartY);
  
  const tableData = data.map(row => [
    new Date(row.sale_date).toLocaleDateString('en-IN'),
    row.orders?.toString() || '0',
    row.items_sold?.toString() || '0',
    `Rs. ${parseFloat(row.daily_revenue || 0).toFixed(2)}`,
    row.total_quantity?.toString() || '0',
    row.category || 'N/A'
  ]);
  
  autoTable(doc, {
    startY: detailStartY + 5,
    head: [['Date', 'Orders', 'Items', 'Revenue', 'Qty', 'Category']],
    body: tableData.length > 0 ? tableData : [['No sales data available', '', '', '', '', '']],
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.text
    },
    alternateRowStyles: {
      fillColor: [248, 249, 255]
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 'auto' }
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });
  
  // Add sales trends and insights
  const finalY = doc.lastAutoTable?.finalY + 15 || detailStartY + 100;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Sales Analysis', 15, finalY);
  
  // Calculate statistics
  const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;
  const avgItemsPerOrder = totalOrders > 0 ? (totalItems / totalOrders).toFixed(1) : 0;
  const totalDays = data.length;
  const avgDailyRevenue = totalDays > 0 ? (totalRevenue / totalDays).toFixed(2) : 0;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  const analysis = [
    `• Average Order Value: Rs. ${avgOrderValue} per order`,
    `• Average Items Per Order: ${avgItemsPerOrder} items`,
    `• Average Daily Revenue: Rs. ${avgDailyRevenue}`,
    `• Total Active Days: ${totalDays} days in the reporting period`,
    `• Sales Performance: ${totalOrders > 0 ? 'Active sales recorded' : 'No sales activity'}`
  ];
  
  let analysisY = finalY + 7;
  analysis.forEach(item => {
    doc.text(item, 15, analysisY);
    analysisY += 6;
  });
  
  // Add signature section
  addSignatureSection(doc, analysisY + 10);
  
  // Add footer
  addFooter(doc);
  
  // Open print dialog
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};

/**
 * Generate GST Report PDF
 */
export const generateGSTReportPDF = (data, startDate, endDate) => {
  const doc = new jsPDF();
  const COMPANY_INFO = getCompanyInfo();
  
  // Add header
  const startY = addHeader(
    doc, 
    'GST Report',
    `Period: ${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')}`
  );
  
  // GST Summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('GST Summary', 15, startY + 5);
  
  const summaryData = [
    ['Total GST Collected', `Rs. ${parseFloat(data.total_gst || 0).toFixed(2)}`],
    ['Total Taxable Value', `Rs. ${parseFloat(data.total_taxable || 0).toFixed(2)}`]
  ];
  
  autoTable(doc, {
    startY: startY + 10,
    body: summaryData,
    theme: 'grid',
    bodyStyles: {
      fontSize: 11,
      textColor: COLORS.text,
      fontStyle: 'bold',
      fillColor: [248, 249, 255]
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 60, halign: 'right' }
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });
  
  let detailStartY = doc.lastAutoTable?.finalY + 15 || startY + 50;
  
  // Check if we need a new page
  const pageHeight = doc.internal.pageSize.height;
  if (detailStartY > pageHeight - 100) {
    doc.addPage();
    detailStartY = 20;
  }
  
  // GST breakdown by rate
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('GST Breakdown by Rate', 15, detailStartY);
  
  const gstData = [
    ['0% GST', `Rs. ${parseFloat(data.gst_0_percent || 0).toFixed(2)}`],
    ['5% GST', `Rs. ${parseFloat(data.gst_5_percent || 0).toFixed(2)}`],
    ['12% GST', `Rs. ${parseFloat(data.gst_12_percent || 0).toFixed(2)}`],
    ['18% GST', `Rs. ${parseFloat(data.gst_18_percent || 0).toFixed(2)}`],
    ['28% GST', `Rs. ${parseFloat(data.gst_28_percent || 0).toFixed(2)}`],
    ['Total GST', `Rs. ${parseFloat(data.total_gst || 0).toFixed(2)}`]
  ];
  
  autoTable(doc, {
    startY: detailStartY + 5,
    head: [['GST Rate', 'Amount']],
    body: gstData,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 11
    },
    bodyStyles: {
      fontSize: 10,
      textColor: COLORS.text
    },
    alternateRowStyles: {
      fillColor: [248, 249, 255]
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.row.index === gstData.length - 1) {
        data.cell.styles.fillColor = COLORS.lightGray;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 11;
      }
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });
  
  // Add GST compliance note
  let finalY = doc.lastAutoTable?.finalY || detailStartY + 100;
  
  // Check if we need a new page for compliance section
  if (finalY > pageHeight - 100) {
    doc.addPage();
    finalY = 20;
  }
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('GST Compliance Information', 15, finalY + 15);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  const complianceInfo = [
    `GSTIN: ${COMPANY_INFO.gstin}`,
    `Total Taxable Amount: Rs. ${parseFloat(data.total_taxable || 0).toFixed(2)}`,
    `Total GST Collected: Rs. ${parseFloat(data.total_gst || 0).toFixed(2)}`,
    `Effective Tax Rate: ${data.total_taxable > 0 ? ((data.total_gst / data.total_taxable) * 100).toFixed(2) : 0}%`,
    ``,
    `This report is generated for GST filing and compliance purposes.`,
    `Ensure all invoices are properly maintained and reconciled with this report.`
  ];
  
  let complianceY = finalY + 22;
  complianceInfo.forEach(info => {
    if (info === '') {
      complianceY += 3;
    } else {
      doc.text(info, 15, complianceY);
      complianceY += 6;
    }
  });
  
  // Add important notice box
  if (complianceY > pageHeight - 50) {
    doc.addPage();
    complianceY = 20;
  }
  
  doc.setDrawColor(...COLORS.warning);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, complianceY, doc.internal.pageSize.width - 30, 18, 2, 2, 'S');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.warning);
  doc.text('⚠ IMPORTANT:', 18, complianceY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const warningText = 'This report must be verified before GST return filing.';
  const warningText2 = 'Keep supporting documents for audit purposes.';
  doc.text(warningText, 18, complianceY + 12);
  doc.text(warningText2, 18, complianceY + 16);
  
  // Add signature section
  const sigY = addSignatureSection(doc, complianceY + 25);
  
  // Add footer
  addFooter(doc);
  
  // Open print dialog
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};

/**
 * Generate Customer Report PDF
 */
export const generateCustomerReportPDF = (data, startDate, endDate) => {
  const doc = new jsPDF();
  
  // Add header
  const startY = addHeader(
    doc, 
    'Customer Report',
    `Period: ${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')}`
  );
  
  // Summary section
  const totalSpent = data.reduce((sum, c) => sum + (parseFloat(c.total_spent) || 0), 0);
  const totalPaid = data.reduce((sum, c) => sum + (parseFloat(c.paid_amount) || 0), 0);
  const totalDue = data.reduce((sum, c) => sum + (parseFloat(c.due_amount) || 0), 0);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Customer Summary', 15, startY + 5);
  
  const summaryData = [
    ['Total Customers', data.length.toString()],
    ['Total Spent', `Rs. ${totalSpent.toFixed(2)}`],
    ['Total Paid', `Rs. ${totalPaid.toFixed(2)}`],
    ['Total Due', `Rs. ${totalDue.toFixed(2)}`]
  ];
  
  autoTable(doc, {
    startY: startY + 10,
    body: summaryData,
    theme: 'grid',
    bodyStyles: {
      fontSize: 10,
      textColor: COLORS.text,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 60, halign: 'right' }
    },
    didParseCell: (cellData) => {
      if (cellData.row.index === summaryData.length - 1) {
        cellData.cell.styles.textColor = COLORS.danger;
      }
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });
  
  let detailStartY = doc.lastAutoTable?.finalY + 15 || startY + 70;
  
  // Check if we need a new page
  const pageHeight = doc.internal.pageSize.height;
  if (detailStartY > pageHeight - 100) {
    doc.addPage();
    detailStartY = 20;
  }
  
  // Customer details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Customer Details', 15, detailStartY);
  
  const tableData = data.map(customer => [
    customer.name,
    customer.email || 'N/A',
    customer.total_orders?.toString() || '0',
    `Rs. ${parseFloat(customer.total_spent || 0).toFixed(2)}`,
    `Rs. ${parseFloat(customer.paid_amount || 0).toFixed(2)}`,
    `Rs. ${parseFloat(customer.due_amount || 0).toFixed(2)}`
  ]);
  
  autoTable(doc, {
    startY: detailStartY + 5,
    head: [['Name', 'Email', 'Orders', 'Spent', 'Paid', 'Due']],
    body: tableData.length > 0 ? tableData : [['No customer data available', '', '', '', '', '']],
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8,
      textColor: COLORS.text
    },
    alternateRowStyles: {
      fillColor: [248, 249, 255]
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 45 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' }
    },
    didParseCell: (cellData) => {
      // Highlight due amounts in red
      if (cellData.column.index === 5 && cellData.section === 'body') {
        const dueAmount = parseFloat(data[cellData.row.index]?.due_amount || 0);
        if (dueAmount > 0) {
          cellData.cell.styles.textColor = COLORS.danger;
          cellData.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });
  
  // Add customer insights and credit analysis
  let finalY = doc.lastAutoTable?.finalY + 15 || detailStartY + 100;
  
  // Check if we need a new page for insights
  if (finalY > pageHeight - 80) {
    doc.addPage();
    finalY = 20;
  }
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Customer Credit Analysis', 15, finalY);
  
  // Calculate metrics
  const avgSpendPerCustomer = data.length > 0 ? (totalSpent / data.length).toFixed(2) : 0;
  const collectionEfficiency = totalSpent > 0 ? ((totalPaid / totalSpent) * 100).toFixed(1) : 0;
  const avgOrdersPerCustomer = data.length > 0 ? (data.reduce((sum, c) => sum + parseInt(c.total_orders || 0), 0) / data.length).toFixed(1) : 0;
  const customersWithDues = data.filter(c => parseFloat(c.due_amount) > 0).length;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  const insights = [
    `• Average Spend Per Customer: Rs. ${avgSpendPerCustomer}`,
    `• Collection Efficiency: ${collectionEfficiency}% of total receivables collected`,
    `• Average Orders Per Customer: ${avgOrdersPerCustomer} orders`,
    `• Customers with Outstanding Dues: ${customersWithDues} out of ${data.length} (${data.length > 0 ? ((customersWithDues / data.length) * 100).toFixed(1) : 0}%)`,
    `• Total Outstanding: Rs. ${totalDue.toFixed(2)} ${totalDue > 0 ? '⚠ Requires attention' : '✓ All clear'}`
  ];
  
  let insightY = finalY + 7;
  insights.forEach(insight => {
    doc.text(insight, 15, insightY);
    insightY += 6;
  });
  
  // Add recommendation box if there are significant dues
  if (totalDue > totalSpent * 0.2) {
    if (insightY > pageHeight - 50) {
      doc.addPage();
      insightY = 20;
    }
    
    doc.setDrawColor(...COLORS.danger);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, insightY + 3, doc.internal.pageSize.width - 30, 18, 2, 2, 'S');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.danger);
    doc.text('⚠ ACTION REQUIRED:', 18, insightY + 9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const actionText1 = 'Outstanding dues exceed 20% of total sales.';
    const actionText2 = 'Consider implementing stricter credit policies.';
    doc.text(actionText1, 18, insightY + 14);
    doc.text(actionText2, 18, insightY + 18);
    insightY += 20;
  }
  
  // Add signature section
  addSignatureSection(doc, insightY + 10);
  
  // Add footer
  addFooter(doc);
  
  // Open print dialog
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};

/**
 * Generate Inventory Report PDF
 */
export const generateInventoryReportPDF = (data) => {
  const doc = new jsPDF();
  
  // Add header
  const startY = addHeader(doc, 'Inventory Report', `As of ${new Date().toLocaleDateString('en-IN')}`);
  
  // Summary section
  const totalOnHand = data.reduce((sum, p) => sum + (parseInt(p.quantity_on_hand) || 0), 0);
  const inventoryValue = data.reduce((sum, p) => sum + (parseFloat(p.inventory_value) || 0), 0);
  const retailValue = data.reduce((sum, p) => sum + (parseFloat(p.retail_value) || 0), 0);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Inventory Summary', 15, startY + 5);
  
  const summaryData = [
    ['Total Products', data.length.toString()],
    ['Total Units On Hand', totalOnHand.toString()],
    ['Total Inventory Value', `Rs. ${inventoryValue.toFixed(2)}`],
    ['Total Retail Value', `Rs. ${retailValue.toFixed(2)}`],
    ['Potential Profit', `Rs. ${(retailValue - inventoryValue).toFixed(2)}`]
  ];
  
  autoTable(doc, {
    startY: startY + 10,
    body: summaryData,
    theme: 'grid',
    bodyStyles: {
      fontSize: 10,
      textColor: COLORS.text,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 60, halign: 'right' }
    },
    didParseCell: (cellData) => {
      if (cellData.row.index === summaryData.length - 1) {
        cellData.cell.styles.textColor = COLORS.success;
      }
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });
  
  let detailStartY = doc.lastAutoTable?.finalY + 15 || startY + 80;
  
  // Check if we need a new page
  const pageHeight = doc.internal.pageSize.height;
  if (detailStartY > pageHeight - 100) {
    doc.addPage();
    detailStartY = 20;
  }
  
  // Product details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Product Details', 15, detailStartY);
  
  const tableData = data.map(product => [
    product.name,
    product.category || 'N/A',
    product.quantity_on_hand?.toString() || '0',
    `Rs. ${parseFloat(product.inventory_value || 0).toFixed(2)}`,
    `Rs. ${parseFloat(product.retail_value || 0).toFixed(2)}`
  ]);
  
  autoTable(doc, {
    startY: detailStartY + 5,
    head: [['Product', 'Category', 'On Hand', 'Inv. Value', 'Retail Value']],
    body: tableData.length > 0 ? tableData : [['No inventory data available', '', '', '', '']],
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.text
    },
    alternateRowStyles: {
      fillColor: [248, 249, 255]
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 35 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 40, halign: 'right' },
      4: { cellWidth: 40, halign: 'right' }
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });
  
  // Add inventory insights and stock alerts
  let finalY = doc.lastAutoTable?.finalY + 15 || detailStartY + 100;
  
  // Check if we need a new page for insights
  if (finalY > pageHeight - 90) {
    doc.addPage();
    finalY = 20;
  }
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Inventory Insights & Stock Health', 15, finalY);
  
  // Calculate metrics
  const avgInventoryPerProduct = data.length > 0 ? (totalOnHand / data.length).toFixed(1) : 0;
  const potentialProfit = retailValue - inventoryValue;
  const profitMarginPercent = inventoryValue > 0 ? ((potentialProfit / inventoryValue) * 100).toFixed(1) : 0;
  const avgProductValue = data.length > 0 ? (inventoryValue / data.length).toFixed(2) : 0;
  const lowStockItems = data.filter(p => parseInt(p.quantity_on_hand) < 10).length;
  const outOfStockItems = data.filter(p => parseInt(p.quantity_on_hand) === 0).length;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  const insights = [
    `• Average Stock Per Product: ${avgInventoryPerProduct} units`,
    `• Average Product Value: Rs. ${avgProductValue}`,
    `• Potential Profit Margin: ${profitMarginPercent}% (Rs. ${potentialProfit.toFixed(2)})`,
    `• Inventory Turnover: ${inventoryValue > 0 ? 'Calculate based on COGS' : 'N/A'}`,
    `• Low Stock Alert: ${lowStockItems} products below 10 units`,
    `• Out of Stock: ${outOfStockItems} products ${outOfStockItems > 0 ? '⚠ Need reordering' : '✓'}`
  ];
  
  let insightY = finalY + 7;
  insights.forEach(insight => {
    doc.text(insight, 15, insightY);
    insightY += 6;
  });
  
  // Add stock alert box if necessary
  if (lowStockItems > 0 || outOfStockItems > 0) {
    if (insightY > pageHeight - 50) {
      doc.addPage();
      insightY = 20;
    }
    
    doc.setDrawColor(...COLORS.warning);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, insightY + 3, doc.internal.pageSize.width - 30, 18, 2, 2, 'S');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.warning);
    doc.text('⚠ STOCK ALERT:', 18, insightY + 9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const alertLine1 = `${outOfStockItems} items out of stock, ${lowStockItems} items running low.`;
    const alertLine2 = 'Review and reorder immediately.';
    doc.text(alertLine1, 18, insightY + 14);
    doc.text(alertLine2, 18, insightY + 18);
    insightY += 20;
  }
  
  // Add recommendation
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Note: Maintain optimal stock levels to balance inventory costs and meet customer demand.', 15, insightY + 8);
  
  // Add signature section
  addSignatureSection(doc, insightY + 18);
  
  // Add footer
  addFooter(doc);
  
  // Open print dialog
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};

/**
 * Generate Customer Payment History PDF
 */
export const generateCustomerPaymentHistoryPDF = (customer, startDate, endDate) => {
  const doc = new jsPDF();
  
  // Add header
  const startY = addHeader(
    doc, 
    'Payment History',
    `${customer.name}`
  );
  
  // Customer Info Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Customer Details', 15, startY + 5);
  
  const customerInfo = [
    ['Customer Name', customer.name],
    ['Email', customer.email || 'N/A'],
    ['Report Period', `${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')}`]
  ];
  
  autoTable(doc, {
    startY: startY + 10,
    body: customerInfo,
    theme: 'grid',
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.text
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 'auto' }
    },
    margin: { left: 15, right: 15 }
  });
  
  let paymentStartY = doc.lastAutoTable?.finalY + 15 || startY + 60;
  
  // Payment Summary
  const totalPaid = customer.payment_history?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
  const totalSpent = parseFloat(customer.total_spent || 0);
  const totalDue = parseFloat(customer.due_amount || 0);
  const totalDebitNotes = customer.debit_notes?.reduce((sum, n) => sum + parseFloat(n.amount || 0), 0) || 0;
  const totalCreditNotes = customer.credit_notes?.reduce((sum, n) => sum + parseFloat(n.amount || 0), 0) || 0;
  const debitCreditBalance = parseFloat(customer.debit_credit_balance || 0);
  const remainingAmountDue = totalSpent - totalPaid + totalDebitNotes - totalCreditNotes;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Payment Summary', 15, paymentStartY);
  
  const summaryData = [
    ['Total Amount', ` ${totalSpent.toFixed(2)}`],
    ['Total Paid', ` ${totalPaid.toFixed(2)}`],
    ['Balance Due', ` ${totalDue.toFixed(2)}`],
    ['Total Debit Notes (Owed)', ` ${totalDebitNotes.toFixed(2)}`],
    ['Total Credit Notes (Refund)', ` ${totalCreditNotes.toFixed(2)}`],
    ['Net Debit/Credit Balance', ` ${debitCreditBalance.toFixed(2)}`],
    ['Remaining Amount Due', ` ${remainingAmountDue.toFixed(2)}`],
    ['Total Payments', (customer.payment_history?.length || 0).toString()]
  ];
  
  autoTable(doc, {
    startY: paymentStartY + 5,
    body: summaryData,
    theme: 'grid',
    bodyStyles: {
      fontSize: 10,
      textColor: COLORS.text,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 60, halign: 'right' }
    },
    didParseCell: (cellData) => {
      if (cellData.row.index === 2) { // Balance Due row
        cellData.cell.styles.textColor = COLORS.danger;
      } else if (cellData.row.index === 1) { // Total Paid row
        cellData.cell.styles.textColor = COLORS.success;
      } else if (cellData.row.index === 3) { // Debit Notes row
        cellData.cell.styles.textColor = COLORS.danger;
      } else if (cellData.row.index === 4) { // Credit Notes row
        cellData.cell.styles.textColor = [25, 118, 210]; // Blue
      } else if (cellData.row.index === 5) { // Net Balance row
        const balance = parseFloat(customer.debit_credit_balance || 0);
        cellData.cell.styles.textColor = balance > 0 ? COLORS.danger : COLORS.success;
      } else if (cellData.row.index === 6) { // Remaining Amount Due row
        const remaining = totalSpent - totalPaid + totalDebitNotes - totalCreditNotes;
        cellData.cell.styles.textColor = remaining > 0 ? COLORS.danger : COLORS.success;
        cellData.cell.styles.fillColor = remaining > 0 ? [255, 235, 235] : [235, 255, 235];
      }
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });
  
  let historyStartY = doc.lastAutoTable?.finalY + 15 || paymentStartY + 60;
  
  // Check if we need a new page
  const pageHeight = doc.internal.pageSize.height;
  if (historyStartY > pageHeight - 100) {
    doc.addPage();
    historyStartY = 20;
  }
  
  // Combined Transaction History (Payments, Debit Notes, Credit Notes)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Transaction History', 15, historyStartY);
  
  // Combine all transactions
  const allTransactions = [];
  
  // Add payments
  if (customer.payment_history && customer.payment_history.length > 0) {
    customer.payment_history.forEach(payment => {
      allTransactions.push({
        date: new Date(payment.payment_date),
        type: 'Payment',
        reference: payment.invoice_number || 'N/A',
        amount: parseFloat(payment.amount),
        details: payment.payment_method || '-',
        description: payment.notes || '-',
        color: 'green'
      });
    });
  }
  
  // Add debit notes
  if (customer.debit_notes && customer.debit_notes.length > 0) {
    customer.debit_notes.forEach(note => {
      allTransactions.push({
        date: new Date(note.note_date),
        type: 'Debit Note',
        reference: note.debit_note_number || 'N/A',
        amount: parseFloat(note.amount),
        details: note.reason || '-',
        description: note.description || '-',
        color: 'red'
      });
    });
  }
  
  // Add credit notes
  if (customer.credit_notes && customer.credit_notes.length > 0) {
    customer.credit_notes.forEach(note => {
      allTransactions.push({
        date: new Date(note.note_date),
        type: 'Credit Note',
        reference: note.credit_note_number || 'N/A',
        amount: parseFloat(note.amount),
        details: note.reason || '-',
        description: note.description || '-',
        color: 'blue'
      });
    });
  }
  
  // Sort by date (newest first)
  allTransactions.sort((a, b) => b.date - a.date);
  
  if (allTransactions.length > 0) {
    const transactionTableData = allTransactions.map(transaction => {
      const amountPrefix = transaction.type === 'Payment' ? '' : 
                          transaction.type === 'Debit Note' ? '+' : '-';
      return [
        transaction.date.toLocaleDateString('en-IN'),
        transaction.type,
        transaction.reference,
        `${amountPrefix} ${transaction.amount.toFixed(2)}`,
        transaction.details,
        transaction.description
      ];
    });
    
    autoTable(doc, {
      startY: historyStartY + 5,
      head: [['Date', 'Type', 'Reference', 'Amount', 'Details', 'Description']],
      body: transactionTableData,
      theme: 'striped',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        valign: 'middle'
      },
      bodyStyles: {
        fontSize: 7,
        textColor: COLORS.text,
        halign: 'left',
        valign: 'middle',
        overflow: 'linebreak'
      },
      alternateRowStyles: {
        fillColor: [248, 249, 255]
      },
        columnStyles: {
          0: { cellWidth: 'auto', halign: 'center' },
          1: { cellWidth: 'auto', halign: 'center' },
          2: { cellWidth: 'auto', halign: 'center' },
          3: { cellWidth: 'auto', halign: 'center', fontStyle: 'bold' },
          4: { cellWidth: 'auto', halign: 'center' },
          5: { cellWidth: 'auto', halign: 'center' }
        },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const transaction = allTransactions[data.row.index];
          if (transaction.color === 'green') {
            data.cell.styles.textColor = COLORS.success;
          } else if (transaction.color === 'red') {
            data.cell.styles.textColor = COLORS.danger;
          } else if (transaction.color === 'blue') {
            data.cell.styles.textColor = [25, 118, 210];
          }
        }
      },
      margin: { left: 15, right: 15, bottom: 40 },
      didDrawPage: (data) => {
        // Ensure content doesn't overlap footer
        if (data.cursor.y > pageHeight - 40) {
          doc.addPage();
        }
      }
    });
    
    // Add totals row
    // const finalY = doc.lastAutoTable?.finalY || historyStartY + 100;
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('No transaction records found for this period.', 15, historyStartY + 10);
  }
  
  // Add payment insights
  let insightY = doc.lastAutoTable?.finalY + 15 || historyStartY + 60;
  
  // Check if we need a new page
  if (insightY > pageHeight - 100) {
    doc.addPage();
    insightY = 20;
  }
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Payment Insights', 15, insightY);
  
  const collectionRate = totalSpent > 0 ? ((totalPaid / totalSpent) * 100).toFixed(1) : 0;
  const avgPaymentAmount = customer.payment_history?.length > 0 
    ? (totalPaid / customer.payment_history.length).toFixed(2) 
    : 0;
  
  const insights = [
    ['Collection Rate', `${collectionRate}%`],
    ['Average Payment', ` ${avgPaymentAmount}`],
    ['Total Orders', customer.total_orders?.toString() || '0'],
    ['Total Debit Notes Count', (customer.debit_notes?.length || 0).toString()],
    ['Total Credit Notes Count', (customer.credit_notes?.length || 0).toString()]
  ];
  
  autoTable(doc, {
    startY: insightY + 5,
    body: insights,
    theme: 'grid',
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.text
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 60, halign: 'right' }
    },
    margin: { left: 15, right: 15, bottom: 40 },
    tableWidth: 'auto'
  });
  
  // Add note section
  let noteY = doc.lastAutoTable?.finalY + 10 || insightY + 50;
  
  // Check if we need a new page for note
  if (noteY > pageHeight - 80) {
    doc.addPage();
    noteY = 20;
  }
  
  if (totalDue > 0) {
    doc.setDrawColor(...COLORS.danger);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, noteY, doc.internal.pageSize.width - 30, 15, 2, 2, 'S');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.danger);
    doc.text('⚠ PAYMENT REMINDER:', 18, noteY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`Outstanding balance of  ${totalDue.toFixed(2)} pending. Please follow up for collection.`, 18, noteY + 10);
  }
  
  // Add signature section
  const signatureY = totalDue > 0 ? noteY + 25 : noteY;
  
  // Check if we need a new page for signature
  if (signatureY > pageHeight - 70) {
    doc.addPage();
    addSignatureSection(doc, 20);
  } else {
    addSignatureSection(doc, signatureY);
  }
  
  // Add footer
  addFooter(doc);
  
  // Open print dialog
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};

/**
 * Generate Vendor Report PDF
 */
export const generateVendorReportPDF = (data, startDate, endDate) => {
  const doc = new jsPDF();
  
  // Add header
  const startY = addHeader(
    doc, 
    'Vendor Report',
    `Period: ${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')}`
  );
  
  // Summary section
  const totalPurchased = data.reduce((sum, v) => sum + (parseFloat(v.total_purchased) || 0), 0);
  const totalPaid = data.reduce((sum, v) => sum + (parseFloat(v.paid_amount) || 0), 0);
  const totalDue = data.reduce((sum, v) => sum + (parseFloat(v.due_amount) || 0), 0);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Vendor Summary', 15, startY + 5);
  
  const summaryData = [
    ['Total Vendors', data.length.toString()],
    ['Total Purchased', `Rs. ${totalPurchased.toFixed(2)}`],
    ['Total Paid', `Rs. ${totalPaid.toFixed(2)}`],
    ['Total Due', `Rs. ${totalDue.toFixed(2)}`]
  ];
  
  autoTable(doc, {
    startY: startY + 10,
    body: summaryData,
    theme: 'grid',
    bodyStyles: {
      fontSize: 10,
      textColor: COLORS.text,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 60, halign: 'right' }
    },
    didParseCell: (cellData) => {
      if (cellData.row.index === summaryData.length - 1) {
        cellData.cell.styles.textColor = COLORS.danger;
      }
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });
  
  let detailStartY = doc.lastAutoTable?.finalY + 15 || startY + 70;
  
  // Check if we need a new page
  const pageHeight = doc.internal.pageSize.height;
  if (detailStartY > pageHeight - 100) {
    doc.addPage();
    detailStartY = 20;
  }
  
  // Vendor details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Vendor Details', 15, detailStartY);
  
  const tableData = data.map(vendor => [
    vendor.name,
    vendor.email || 'N/A',
    vendor.phone || 'N/A',
    vendor.total_orders?.toString() || '0',
    `Rs. ${parseFloat(vendor.total_purchased || 0).toFixed(2)}`,
    `Rs. ${parseFloat(vendor.paid_amount || 0).toFixed(2)}`,
    `Rs. ${parseFloat(vendor.due_amount || 0).toFixed(2)}`
  ]);
  
  autoTable(doc, {
    startY: detailStartY + 5,
    head: [['Name', 'Email', 'Phone', 'Orders', 'Purchased', 'Paid', 'Due']],
    body: tableData.length > 0 ? tableData : [['No vendor data available', '', '', '', '', '', '']],
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8,
      textColor: COLORS.text
    },
    alternateRowStyles: {
      fillColor: [248, 249, 255]
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 35 },
      2: { cellWidth: 25 },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
      6: { cellWidth: 28, halign: 'right' }
    },
    didParseCell: (cellData) => {
      // Highlight due amounts in red
      if (cellData.column.index === 6 && cellData.section === 'body') {
        const dueAmount = parseFloat(data[cellData.row.index]?.due_amount || 0);
        if (dueAmount > 0) {
          cellData.cell.styles.textColor = COLORS.danger;
          cellData.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });
  
  // Add vendor insights and payment analysis
  let finalY = doc.lastAutoTable?.finalY + 15 || detailStartY + 100;
  
  // Check if we need a new page for insights
  if (finalY > pageHeight - 80) {
    doc.addPage();
    finalY = 20;
  }
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Vendor Payment Analysis', 15, finalY);
  
  // Calculate metrics
  const avgPurchasePerVendor = data.length > 0 ? (totalPurchased / data.length).toFixed(2) : 0;
  const paymentEfficiency = totalPurchased > 0 ? ((totalPaid / totalPurchased) * 100).toFixed(1) : 0;
  const avgOrdersPerVendor = data.length > 0 ? (data.reduce((sum, v) => sum + parseInt(v.total_orders || 0), 0) / data.length).toFixed(1) : 0;
  const vendorsWithDues = data.filter(v => parseFloat(v.due_amount) > 0).length;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  const insights = [
    `• Average Purchase Per Vendor: Rs. ${avgPurchasePerVendor}`,
    `• Payment Efficiency: ${paymentEfficiency}% of total payables settled`,
    `• Average Orders Per Vendor: ${avgOrdersPerVendor} orders`,
    `• Vendors with Outstanding Dues: ${vendorsWithDues} out of ${data.length} (${data.length > 0 ? ((vendorsWithDues / data.length) * 100).toFixed(1) : 0}%)`,
    `• Total Outstanding: Rs. ${totalDue.toFixed(2)} ${totalDue > 0 ? '⚠ Payment required' : '✓ All settled'}`
  ];
  
  let insightY = finalY + 7;
  insights.forEach(insight => {
    doc.text(insight, 15, insightY);
    insightY += 6;
  });
  
  // Add action box if there are significant dues
  if (totalDue > totalPurchased * 0.15) {
    if (insightY > pageHeight - 50) {
      doc.addPage();
      insightY = 20;
    }
    
    doc.setDrawColor(...COLORS.danger);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, insightY + 3, doc.internal.pageSize.width - 30, 18, 2, 2, 'S');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.danger);
    doc.text('⚠ ACTION REQUIRED:', 18, insightY + 9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const actionText1 = 'Outstanding payables exceed 15% of total purchases.';
    const actionText2 = 'Schedule payments to maintain vendor relationships.';
    doc.text(actionText1, 18, insightY + 14);
    doc.text(actionText2, 18, insightY + 18);
    insightY += 20;
  }
  
  // Add signature section
  addSignatureSection(doc, insightY + 10);
  
  // Add footer
  addFooter(doc);
  
  // Open print dialog
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};

/**
 * Generate Vendor Payment History PDF
 */
export const generateVendorPaymentHistoryPDF = (vendor, startDate, endDate) => {
  const doc = new jsPDF();
  
  // Add header
  const startY = addHeader(
    doc,
    'Vendor Payment History',
    `${vendor.name} | Period: ${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')}`
  );
  
  // Vendor Information
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Vendor Information', 15, startY + 5);
  
  const vendorInfo = [
    ['Vendor Name', vendor.name],
    ['Email', vendor.email || 'N/A'],
    ['Phone', vendor.phone || 'N/A']
  ];
  
  autoTable(doc, {
    startY: startY + 10,
    body: vendorInfo,
    theme: 'plain',
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.text
    },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 80 }
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });
  
  // Financial Summary
  let summaryY = doc.lastAutoTable?.finalY + 10 || startY + 50;
  
  const totalPurchased = parseFloat(vendor.total_purchased || 0);
  const totalPaid = (vendor.payment_history || []).reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const totalDebitNotes = (vendor.debit_notes || []).reduce((sum, n) => sum + parseFloat(n.amount), 0);
  const totalCreditNotes = (vendor.credit_notes || []).reduce((sum, n) => sum + parseFloat(n.amount), 0);
  const totalDue = parseFloat(vendor.due_amount || 0);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Financial Summary', 15, summaryY);
  
  const financialData = [
    ['Total Purchased', `Rs. ${totalPurchased.toFixed(2)}`],
    ['Total Paid', `Rs. ${totalPaid.toFixed(2)}`],
    ['Debit Notes (Reduce Payable)', `Rs. -${totalDebitNotes.toFixed(2)}`],
    ['Credit Notes (Add Payable)', `Rs. +${totalCreditNotes.toFixed(2)}`],
    ['Net Balance Due', `Rs. ${totalDue.toFixed(2)}`]
  ];
  
  autoTable(doc, {
    startY: summaryY + 5,
    body: financialData,
    theme: 'grid',
    bodyStyles: {
      fontSize: 10,
      textColor: COLORS.text,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 60, halign: 'right' }
    },
    didParseCell: (cellData) => {
      if (cellData.row.index === financialData.length - 1) {
        const dueAmount = parseFloat(vendor.due_amount || 0);
        cellData.cell.styles.textColor = dueAmount > 0 ? COLORS.danger : COLORS.success;
        cellData.cell.styles.fillColor = dueAmount > 0 ? [255, 235, 235] : [235, 255, 235];
      }
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto'
  });
  
  // Payment History
  let historyStartY = doc.lastAutoTable?.finalY + 15 || summaryY + 70;
  
  const pageHeight = doc.internal.pageSize.height;
  
  // Check if we need a new page
  if (historyStartY > pageHeight - 100) {
    doc.addPage();
    historyStartY = 20;
  }
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Payment Transactions', 15, historyStartY);
  
  // Payments Table
  if (vendor.payment_history && vendor.payment_history.length > 0) {
    const paymentData = vendor.payment_history.map(payment => [
      new Date(payment.payment_date).toLocaleDateString('en-IN'),
      payment.po_number || 'N/A',
      payment.payment_method,
      `Rs. ${parseFloat(payment.amount).toFixed(2)}`,
      payment.reference_number || '-',
      payment.notes || '-'
    ]);
    
    autoTable(doc, {
      startY: historyStartY + 5,
      head: [['Date', 'PO #', 'Method', 'Amount', 'Reference', 'Notes']],
      body: paymentData,
      theme: 'striped',
      headStyles: {
        fillColor: COLORS.success,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        valign: 'middle'
      },
      bodyStyles: {
        fontSize: 7,
        textColor: COLORS.text,
        halign: 'left',
        valign: 'middle',
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'center' },
        1: { cellWidth: 'auto', halign: 'center' },
        2: { cellWidth: 'auto', halign: 'center' },
        3: { cellWidth: 'auto', halign: 'right', textColor: COLORS.success, fontStyle: 'bold' },
        4: { cellWidth: 'auto', halign: 'left' },
        5: { cellWidth: 'auto', halign: 'left' }
      },
      margin: { left: 15, right: 15 }
    });
    
    historyStartY = doc.lastAutoTable?.finalY + 10 || historyStartY + 50;
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('No payments recorded for this period.', 15, historyStartY + 10);
    historyStartY += 20;
  }
  
  // Debit Notes Table
  if (vendor.debit_notes && vendor.debit_notes.length > 0) {
    if (historyStartY > pageHeight - 80) {
      doc.addPage();
      historyStartY = 20;
    }
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text('Debit Notes (Reduce Payable)', 15, historyStartY);
    
    const debitData = vendor.debit_notes.map(note => [
      new Date(note.note_date).toLocaleDateString('en-IN'),
      note.debit_note_number,
      `Rs. -${parseFloat(note.amount).toFixed(2)}`,
      note.reason,
      note.status,
      note.description || '-'
    ]);
    
    autoTable(doc, {
      startY: historyStartY + 5,
      head: [['Date', 'Note #', 'Amount', 'Reason', 'Status', 'Description']],
      body: debitData,
      theme: 'striped',
      headStyles: {
        fillColor: COLORS.danger,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        valign: 'middle'
      },
      bodyStyles: {
        fontSize: 7,
        textColor: COLORS.text,
        halign: 'left',
        valign: 'middle',
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'center' },
        1: { cellWidth: 'auto', halign: 'center' },
        2: { cellWidth: 'auto', halign: 'right', textColor: COLORS.danger, fontStyle: 'bold' },
        3: { cellWidth: 'auto', halign: 'left' },
        4: { cellWidth: 'auto', halign: 'center' },
        5: { cellWidth: 'auto', halign: 'left' }
      },
      margin: { left: 15, right: 15 }
    });
    
    historyStartY = doc.lastAutoTable?.finalY + 10 || historyStartY + 50;
  }
  
  // Credit Notes Table
  if (vendor.credit_notes && vendor.credit_notes.length > 0) {
    if (historyStartY > pageHeight - 80) {
      doc.addPage();
      historyStartY = 20;
    }
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text('Credit Notes (Increase Payable)', 15, historyStartY);
    
    const creditData = vendor.credit_notes.map(note => [
      new Date(note.note_date).toLocaleDateString('en-IN'),
      note.credit_note_number,
      `Rs. +${parseFloat(note.amount).toFixed(2)}`,
      note.reason,
      note.status,
      note.description || '-'
    ]);
    
    autoTable(doc, {
      startY: historyStartY + 5,
      head: [['Date', 'Note #', 'Amount', 'Reason', 'Status', 'Description']],
      body: creditData,
      theme: 'striped',
      headStyles: {
        fillColor: [25, 118, 210],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        valign: 'middle'
      },
      bodyStyles: {
        fontSize: 7,
        textColor: COLORS.text,
        halign: 'left',
        valign: 'middle',
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'center' },
        1: { cellWidth: 'auto', halign: 'center' },
        2: { cellWidth: 'auto', halign: 'right', textColor: [25, 118, 210], fontStyle: 'bold' },
        3: { cellWidth: 'auto', halign: 'left' },
        4: { cellWidth: 'auto', halign: 'center' },
        5: { cellWidth: 'auto', halign: 'left' }
      },
      margin: { left: 15, right: 15 }
    });
    
    historyStartY = doc.lastAutoTable?.finalY + 10 || historyStartY + 50;
  }
  
  // Check if no transaction records exist
  if (!vendor.payment_history?.length && !vendor.debit_notes?.length && !vendor.credit_notes?.length) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('No transaction records found for this period.', 15, historyStartY + 10);
  }
  
  // Add payment insights
  let insightY = doc.lastAutoTable?.finalY + 15 || historyStartY + 60;
  
  // Check if we need a new page
  if (insightY > pageHeight - 100) {
    doc.addPage();
    insightY = 20;
  }
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text('Payment Insights', 15, insightY);
  
  const paymentRate = totalPurchased > 0 ? ((totalPaid / totalPurchased) * 100).toFixed(1) : 0;
  const avgPaymentAmount = vendor.payment_history?.length > 0 
    ? (totalPaid / vendor.payment_history.length).toFixed(2) 
    : 0;
  
  const insights = [
    ['Payment Rate', `${paymentRate}%`],
    ['Average Payment', `Rs. ${avgPaymentAmount}`],
    ['Total Orders', vendor.total_orders?.toString() || '0'],
    ['Total Debit Notes Count', (vendor.debit_notes?.length || 0).toString()],
    ['Total Credit Notes Count', (vendor.credit_notes?.length || 0).toString()]
  ];
  
  autoTable(doc, {
    startY: insightY + 5,
    body: insights,
    theme: 'grid',
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.text
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 60, halign: 'right' }
    },
    margin: { left: 15, right: 15, bottom: 40 },
    tableWidth: 'auto'
  });
  
  // Add note section
  let noteY = doc.lastAutoTable?.finalY + 10 || insightY + 50;
  
  // Check if we need a new page for note
  if (noteY > pageHeight - 80) {
    doc.addPage();
    noteY = 20;
  }
  
  if (totalDue > 0) {
    doc.setDrawColor(...COLORS.danger);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, noteY, doc.internal.pageSize.width - 30, 15, 2, 2, 'S');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.danger);
    doc.text('⚠ PAYMENT REMINDER:', 18, noteY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`Outstanding balance of Rs. ${totalDue.toFixed(2)} pending. Schedule payment to maintain vendor relationship.`, 18, noteY + 10);
  }
  
  // Add signature section
  const signatureY = totalDue > 0 ? noteY + 25 : noteY;
  
  // Check if we need a new page for signature
  if (signatureY > pageHeight - 70) {
    doc.addPage();
    addSignatureSection(doc, 20);
  } else {
    addSignatureSection(doc, signatureY);
  }
  
  // Add footer
  addFooter(doc);
  
  // Open print dialog
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};
