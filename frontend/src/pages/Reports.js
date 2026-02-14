import React, { useState } from 'react';
import { api } from '../services/api';
import '../styles/Reports.css';
import {
  generateProfitLossPDF,
  generateBalanceSheetPDF,
  generateSalesReportPDF,
  generateGSTReportPDF,
  generateCustomerReportPDF,
  generateVendorReportPDF,
  generateInventoryReportPDF,
  generateCustomerPaymentHistoryPDF,
  generateVendorPaymentHistoryPDF
} from '../utils/pdfGenerator';

function Reports() {
  const [reportType, setReportType] = useState('profit-loss');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [expandedVendor, setExpandedVendor] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const generateReport = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let response;
      switch (reportType) {
        case 'profit-loss':
          response = await api.get('/reports/profit-loss', {
            params: { startDate, endDate },
          });
          break;
        case 'balance-sheet':
          response = await api.get('/reports/balance-sheet');
          break;
        case 'sales':
          response = await api.get('/reports/sales', {
            params: { startDate, endDate },
          });
          break;
        case 'gst':
          response = await api.get('/reports/gst', {
            params: { startDate, endDate },
          });
          break;
        case 'customers':
          response = await api.get('/reports/customers', {
            params: { startDate, endDate },
          });
          break;
        case 'vendors':
          response = await api.get('/reports/vendors', {
            params: { startDate, endDate },
          });
          break;
        case 'inventory':
          response = await api.get('/reports/inventory');
          break;
        default:
          return;
      }
      setReportData(response);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;

    let csv = '';
    if (reportType === 'profit-loss') {
      csv = `Financial Report - Profit & Loss Statement\n`;
      csv += `Period: ${startDate} to ${endDate}\n\n`;
      csv += `Total Revenue,${reportData.revenue?.totalRevenue || 0}\n`;
      csv += `Collected Revenue,${reportData.revenue?.collectedRevenue || 0}\n`;
      csv += `Cost of Goods Sold,${reportData.costOfGoodsSold || 0}\n`;
      csv += `Gross Profit,${reportData.grossProfit || 0}\n`;
      csv += `Gross Profit Margin,${reportData.grossProfitMargin || 0}%\n`;
      csv += `GST Collected,${reportData.gstCollected || 0}\n`;
    } else if (Array.isArray(reportData)) {
      const headers = Object.keys(reportData[0] || {});
      csv = headers.join(',') + '\n';
      reportData.forEach(row => {
        csv += headers.map(h => row[h] || '').join(',') + '\n';
      });
    }

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `report-${reportType}-${Date.now()}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrintReport = () => {
    if (!reportData) return;

    try {
      switch (reportType) {
        case 'profit-loss':
          generateProfitLossPDF(reportData, startDate, endDate);
          break;
        case 'balance-sheet':
          generateBalanceSheetPDF(reportData);
          break;
        case 'sales':
          generateSalesReportPDF(reportData, startDate, endDate);
          break;
        case 'gst':
          generateGSTReportPDF(reportData, startDate, endDate);
          break;
        case 'customers':
          generateCustomerReportPDF(reportData, startDate, endDate);
          break;
        case 'vendors':
          generateVendorReportPDF(reportData, startDate, endDate);
          break;
        case 'inventory':
          generateInventoryReportPDF(reportData);
          break;
        default:
          console.error('Unknown report type');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF: ' + error.message);
    }
  };

  const handlePrintCustomerPayments = (customer) => {
    try {
      generateCustomerPaymentHistoryPDF(customer, startDate, endDate);
    } catch (error) {
      console.error('Error generating customer payment PDF:', error);
      alert('Error generating PDF: ' + error.message);
    }
  };

  const handlePrintVendorPayments = (vendor) => {
    try {
      generateVendorPaymentHistoryPDF(vendor, startDate, endDate);
    } catch (error) {
      console.error('Error generating vendor payment PDF:', error);
      alert('Error generating PDF: ' + error.message);
    }
  };

  return (
    <div className="reports-page">
      <h1>Financial Reports</h1>

      <div className="report-controls">
        <form onSubmit={generateReport}>
          <select 
            value={reportType} 
            onChange={(e) => {
              setReportType(e.target.value);
              setReportData(null);
            }}
          >
            <option value="profit-loss">Profit & Loss Statement</option>
            <option value="balance-sheet">Balance Sheet</option>
            <option value="sales">Sales Report</option>
            <option value="gst">GST Report</option>
            <option value="customers">Customer Report</option>
            <option value="vendors">Vendor Report</option>
            <option value="inventory">Inventory Report</option>
          </select>

          {reportType !== 'balance-sheet' && reportType !== 'inventory' && (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          {reportData && (
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={exportToCSV}
            >
              Export CSV
            </button>
          )}
        </form>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Generating report...</p>
        </div>
      )}

      {!loading && !reportData && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Report Generated</h3>
          <p>Select a report type, choose date range (if applicable), and click "Generate Report" to view data.</p>
        </div>
      )}

      {reportData && (
        <div className="report-content">
          {reportType === 'profit-loss' && (
            <div className="pl-report">
              <div className="report-header">
                <div>
                  <h2>Profit & Loss Statement</h2>
                  <p className="period">Period: {startDate} to {endDate}</p>
                </div>
                <button className="btn-print" onClick={handlePrintReport}>🖨️ Print Report</button>
              </div>
              
              <div className="summary-cards">
                <div className="summary-card revenue">
                  <div className="card-icon">💰</div>
                  <div className="card-content">
                    <p className="card-label">Total Revenue</p>
                    <p className="card-value">{reportData.revenue?.totalRevenue?.toFixed(2) || 0}</p>
                  </div>
                </div>
                <div className="summary-card collected">
                  <div className="card-icon">✅</div>
                  <div className="card-content">
                    <p className="card-label">Collected Revenue</p>
                    <p className="card-value">{reportData.revenue?.collectedRevenue?.toFixed(2) || 0}</p>
                  </div>
                </div>
                <div className="summary-card profit">
                  <div className="card-icon">📈</div>
                  <div className="card-content">
                    <p className="card-label">Gross Profit</p>
                    <p className="card-value">{reportData.grossProfit?.toFixed(2) || 0}</p>
                    <p className="card-subtitle">{reportData.grossProfitMargin || 0}% margin</p>
                  </div>
                </div>
                <div className="summary-card gst">
                  <div className="card-icon">🧾</div>
                  <div className="card-content">
                    <p className="card-label">GST Collected</p>
                    <p className="card-value">{reportData.gstCollected?.toFixed(2) || 0}</p>
                  </div>
                </div>
              </div>
              
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total Revenue</td>
                    <td className="amount">{reportData.revenue?.totalRevenue?.toFixed(2) || 0}</td>
                  </tr>
                  <tr>
                    <td>Collected Revenue</td>
                    <td className="amount">{reportData.revenue?.collectedRevenue?.toFixed(2) || 0}</td>
                  </tr>
                  <tr>
                    <td>Cost of Goods Sold</td>
                    <td className="amount">{reportData.costOfGoodsSold?.toFixed(2) || 0}</td>
                  </tr>
                  <tr className="highlight">
                    <td>Gross Profit</td>
                    <td className="amount">{reportData.grossProfit?.toFixed(2) || 0}</td>
                  </tr>
                  <tr>
                    <td>Gross Profit Margin</td>
                    <td className="amount">{reportData.grossProfitMargin || 0}%</td>
                  </tr>
                  <tr>
                    <td>GST Collected</td>
                    <td className="amount">{reportData.gstCollected?.toFixed(2) || 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'balance-sheet' && (
            <div className="bs-report">
              <div className="report-header">
                <h2>Balance Sheet</h2>
                <button className="btn-print" onClick={handlePrintReport}>🖨️ Print Report</button>
              </div>
              <div className="bs-section">
                <h3>Assets</h3>
                <table>
                  <tbody>
                    <tr>
                      <td>Cash</td>
                      <td className="amount">{reportData.assets?.cash?.toFixed(2) || 0}</td>
                    </tr>
                    <tr>
                      <td>Accounts Receivable (Invoices)</td>
                      <td className="amount">{reportData.assets?.accountsReceivable?.toFixed(2) || 0}</td>
                    </tr>
                    <tr style={{color: parseFloat(reportData.assets?.customerDebitCreditBalance || 0) > 0 ? '#d32f2f' : '#2e7d32'}}>
                      <td>
                        <span style={{marginLeft: '20px'}}>Customer Debit/Credit Balance</span>
                        <span style={{fontSize: '11px', color: '#666', display: 'block', marginLeft: '20px'}}>
                          (+ Debit Notes / - Credit Notes)
                        </span>
                      </td>
                      <td className="amount">
                        {parseFloat(reportData.assets?.customerDebitCreditBalance || 0) > 0 ? '+' : ''}
                        {parseFloat(reportData.assets?.customerDebitCreditBalance || 0).toFixed(2)}
                      </td>
                    </tr>
                    <tr style={{fontWeight: '600', borderTop: '1px solid #e0e0e0'}}>
                      <td style={{paddingLeft: '20px'}}>Total Accounts Receivable</td>
                      <td className="amount">{reportData.assets?.totalAccountsReceivable?.toFixed(2) || 0}</td>
                    </tr>
                    <tr>
                      <td>Inventory</td>
                      <td className="amount">{reportData.assets?.inventory?.toFixed(2) || 0}</td>
                    </tr>
                    <tr className="highlight">
                      <td>Total Assets</td>
                      <td className="amount">{reportData.assets?.totalAssets?.toFixed(2) || 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bs-section">
                <h3>Liabilities</h3>
                <table>
                  <tbody>
                    <tr>
                      <td>Accounts Payable (Purchase Orders)</td>
                      <td className="amount">{reportData.liabilities?.accountsPayable?.toFixed(2) || 0}</td>
                    </tr>
                    <tr style={{color: parseFloat(reportData.liabilities?.vendorDebitCreditBalance || 0) > 0 ? '#d32f2f' : '#2e7d32'}}>
                      <td>
                        <span style={{marginLeft: '20px'}}>Vendor Debit/Credit Balance</span>
                        <span style={{fontSize: '11px', color: '#666', display: 'block', marginLeft: '20px'}}>
                          (+ Credit Notes / - Debit Notes)
                        </span>
                      </td>
                      <td className="amount">
                        {parseFloat(reportData.liabilities?.vendorDebitCreditBalance || 0) > 0 ? '+' : ''}
                        {parseFloat(reportData.liabilities?.vendorDebitCreditBalance || 0).toFixed(2)}
                      </td>
                    </tr>
                    <tr style={{fontWeight: '600', borderTop: '1px solid #e0e0e0'}}>
                      <td style={{paddingLeft: '20px'}}>Total Accounts Payable</td>
                      <td className="amount">{reportData.liabilities?.totalAccountsPayable?.toFixed(2) || 0}</td>
                    </tr>
                    <tr className="highlight">
                      <td>Total Liabilities</td>
                      <td className="amount">{reportData.liabilities?.totalLiabilities?.toFixed(2) || 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bs-section">
                <h3>Equity</h3>
                <table>
                  <tbody>
                    <tr className="highlight">
                      <td>Total Equity</td>
                      <td className="amount">{reportData.equity?.toFixed(2) || 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Debit/Credit Notes Explanation */}
              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#f0f7ff',
                borderRadius: '8px',
                border: '1px solid #1976d2',
                fontSize: '13px'
              }}>
                <h4 style={{margin: '0 0 10px 0', color: '#1976d2'}}>📚 Understanding Debit/Credit Balances</h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                  <div>
                    <strong>Customer Balance (Assets):</strong>
                    <ul style={{margin: '5px 0', paddingLeft: '20px'}}>
                      <li><strong style={{color: '#d32f2f'}}>+ Debit Notes</strong>: Customer owes MORE (increases receivable)</li>
                      <li><strong style={{color: '#2e7d32'}}>- Credit Notes</strong>: Customer owes LESS (decreases receivable)</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Vendor Balance (Liabilities):</strong>
                    <ul style={{margin: '5px 0', paddingLeft: '20px'}}>
                      <li><strong style={{color: '#d32f2f'}}>+ Credit Notes</strong>: We owe vendor MORE (increases payable)</li>
                      <li><strong style={{color: '#2e7d32'}}>- Debit Notes</strong>: We owe vendor LESS (decreases payable)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {reportType === 'sales' && Array.isArray(reportData) && (
            <div className="sales-report">
              <div className="report-header">
                <div>
                  <h2>Sales Report</h2>
                  <p className="period">Period: {startDate} to {endDate}</p>
                </div>
                <button className="btn-print" onClick={handlePrintReport}>🖨️ Print Report</button>
              </div>
              
              {reportData.length > 0 && (
                <div className="summary-cards">
                  <div className="summary-card">
                    <div className="card-icon">📊</div>
                    <div className="card-content">
                      <p className="card-label">Total Orders</p>
                      <p className="card-value">{reportData.reduce((sum, row) => sum + (parseInt(row.orders) || 0), 0)}</p>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="card-icon">📦</div>
                    <div className="card-content">
                      <p className="card-label">Items Sold</p>
                      <p className="card-value">{reportData.reduce((sum, row) => sum + (parseInt(row.items_sold) || 0), 0)}</p>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="card-icon">💵</div>
                    <div className="card-content">
                      <p className="card-label">Total Revenue</p>
                      <p className="card-value">{reportData.reduce((sum, row) => sum + (parseFloat(row.daily_revenue) || 0), 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Orders</th>
                    <th>Items Sold</th>
                    <th>Revenue</th>
                    <th>Quantity</th>
                    <th>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{textAlign: 'center', padding: '20px', color: '#718096'}}>
                        No sales data found for the selected period
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedData = reportData.slice(startIndex, endIndex);
                      
                      return paginatedData.map((row, idx) => (
                        <tr key={idx}>
                          <td>{new Date(row.sale_date).toLocaleDateString()}</td>
                          <td>{row.orders}</td>
                          <td>{row.items_sold}</td>
                          <td>{parseFloat(row.daily_revenue).toFixed(2)}</td>
                          <td>{row.total_quantity}</td>
                          <td>{row.category || 'N/A'}</td>
                        </tr>
                      ));
                    })()
                  )}
                </tbody>
              </table>
              
              {reportData.length > 0 && (
                <div className="pagination-controls">
                  <div className="pagination-info">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, reportData.length)} of {reportData.length} records
                  </div>
                  <div className="pagination-buttons">
                    <button 
                      className="btn-pagination" 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    <span className="page-indicator">Page {currentPage} of {Math.ceil(reportData.length / itemsPerPage)}</span>
                    <button 
                      className="btn-pagination"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(reportData.length / itemsPerPage)))}
                      disabled={currentPage === Math.ceil(reportData.length / itemsPerPage)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {reportType === 'gst' && reportData && typeof reportData === 'object' && !Array.isArray(reportData) && (
            <div className="gst-report">
              <div className="report-header">
                <div>
                  <h2>GST Report</h2>
                  <p className="period">Period: {startDate} to {endDate}</p>
                </div>
                <button className="btn-print" onClick={handlePrintReport}>🖨️ Print Report</button>
              </div>
              
              <div className="summary-cards">
                <div className="summary-card">
                  <div className="card-icon">🧾</div>
                  <div className="card-content">
                    <p className="card-label">Total GST</p>
                    <p className="card-value">{parseFloat(reportData.total_gst || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="card-icon">💵</div>
                  <div className="card-content">
                    <p className="card-label">Taxable Value</p>
                    <p className="card-value">{parseFloat(reportData.total_taxable || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              <table>
                <thead>
                  <tr>
                    <th>GST Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>0% GST</td>
                    <td className="amount">{parseFloat(reportData.gst_0_percent || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>5% GST</td>
                    <td className="amount">{parseFloat(reportData.gst_5_percent || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>12% GST</td>
                    <td className="amount">{parseFloat(reportData.gst_12_percent || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>18% GST</td>
                    <td className="amount">{parseFloat(reportData.gst_18_percent || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>28% GST</td>
                    <td className="amount">{parseFloat(reportData.gst_28_percent || 0).toFixed(2)}</td>
                  </tr>
                  <tr className="highlight">
                    <td>Total GST</td>
                    <td className="amount">{parseFloat(reportData.total_gst || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>Total Taxable Value</td>
                    <td className="amount">{parseFloat(reportData.total_taxable || 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'customers' && Array.isArray(reportData) && (
            <div className="customer-report">
              <div className="report-header">
                <div>
                  <h2>Customer Report</h2>
                  <p className="period">Period: {startDate} to {endDate}</p>
                </div>
                <button className="btn-print" onClick={handlePrintReport}>🖨️ Print Report</button>
              </div>
              
              {reportData.length > 0 && (
                <div className="summary-cards">
                  <div className="summary-card">
                    <div className="card-icon">👥</div>
                    <div className="card-content">
                      <p className="card-label">Total Customers</p>
                      <p className="card-value">{reportData.length}</p>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="card-icon">💰</div>
                    <div className="card-content">
                      <p className="card-label">Total Spent</p>
                      <p className="card-value">{reportData.reduce((sum, c) => sum + (parseFloat(c.total_spent) || 0), 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="card-icon">✅</div>
                    <div className="card-content">
                      <p className="card-label">Total Paid</p>
                      <p className="card-value">{reportData.reduce((sum, c) => sum + (parseFloat(c.paid_amount) || 0), 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="summary-card danger">
                    <div className="card-icon">⚠️</div>
                    <div className="card-content">
                      <p className="card-label">Total Due</p>
                      <p className="card-value">{reportData.reduce((sum, c) => sum + (parseFloat(c.due_amount) || 0), 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <table>
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Email</th>
                    <th>Orders</th>
                    <th>Total Spent</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{textAlign: 'center', padding: '20px', color: '#718096'}}>
                        No customer data found for the selected period
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedCustomers = reportData.slice(startIndex, endIndex);
                      
                      return paginatedCustomers.map(customer => (
                        <React.Fragment key={customer.id}>
                          <tr>
                            <td>{customer.name}</td>
                            <td>{customer.email}</td>
                            <td>{customer.total_orders}</td>
                            <td>{parseFloat(customer.total_spent).toFixed(2)}</td>
                            <td>{parseFloat(customer.paid_amount).toFixed(2)}</td>
                            <td className="due">{parseFloat(customer.due_amount).toFixed(2)}</td>
                            <td>
                              <button 
                                className="btn-view-payments"
                                onClick={() => setExpandedCustomer(expandedCustomer === customer.id ? null : customer.id)}
                              >
                                {expandedCustomer === customer.id ? '▼ Hide' : '▶ View'} Payments
                              </button>
                            </td>
                          </tr>
                          {expandedCustomer === customer.id && (
                            <tr className="payment-history-row">
                              <td colSpan="7">
                                <div className="payment-history-container">
                                  <div className="payment-history-header">
                                    <h4>Payment History for {customer.name}</h4>
                                    <button 
                                      className="btn-print-payments"
                                      onClick={() => handlePrintCustomerPayments(customer)}
                                      title="Print Payment History"
                                    >
                                      🖨️ Print
                                    </button>
                                  </div>
                                  
                                  {/* Payments Section */}
                                  {customer.payment_history && customer.payment_history.length > 0 ? (
                                    <div className="transactions-section">
                                      <h5 style={{marginTop: '10px', marginBottom: '10px', color: '#2e7d32'}}>💰 Payments Received</h5>
                                      <table className="payment-history-table">
                                        <thead>
                                          <tr>
                                            <th>Date</th>
                                            <th>Invoice</th>
                                            <th>Amount Paid</th>
                                            <th>Payment Method</th>
                                            <th>Reference</th>
                                            <th>Notes</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {customer.payment_history.map(payment => (
                                            <tr key={`payment-${payment.id}`}>
                                              <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
                                              <td>{payment.invoice_number || 'N/A'}</td>
                                              <td style={{color: '#2e7d32', fontWeight: '600'}}>{parseFloat(payment.amount).toFixed(2)}</td>
                                              <td>{payment.payment_method}</td>
                                              <td>{payment.reference_number || '-'}</td>
                                              <td>{payment.notes || '-'}</td>
                                            </tr>
                                          ))}
                                        <tr className="payment-total-row">
                                          <td colSpan="2"><strong>Total Payments</strong></td>
                                          <td><strong style={{color: '#2e7d32'}}>{customer.payment_history.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}</strong></td>
                                          <td colSpan="3"></td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="no-payments-message">No payments recorded for this customer in the selected period.</p>
                                )}

                                {/* Debit Notes Section */}
                                {customer.debit_notes && customer.debit_notes.length > 0 && (
                                  <div className="transactions-section" style={{marginTop: '20px'}}>
                                    <h5 style={{marginTop: '10px', marginBottom: '10px', color: '#d32f2f'}}>
                                      📋 Customer Debit Notes 
                                      <span style={{fontSize: '12px', fontWeight: '400', color: '#666', marginLeft: '10px'}}>
                                        (Increases what customer owes)
                                      </span>
                                    </h5>
                                    <table className="payment-history-table">
                                      <thead>
                                        <tr>
                                          <th>Date</th>
                                          <th>Debit Note #</th>
                                          <th>Amount</th>
                                          <th>Reason</th>
                                          <th>Status</th>
                                          <th>Description</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {customer.debit_notes.map(note => (
                                          <tr key={`debit-${note.id}`}>
                                            <td>{new Date(note.note_date).toLocaleDateString()}</td>
                                            <td><strong>{note.debit_note_number}</strong></td>
                                            <td style={{color: '#d32f2f', fontWeight: '600'}}>+{parseFloat(note.amount).toFixed(2)}</td>
                                            <td>{note.reason}</td>
                                            <td>
                                              <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                backgroundColor: note.status === 'approved' ? '#e8f5e9' : note.status === 'cancelled' ? '#ffebee' : '#fff3e0',
                                                color: note.status === 'approved' ? '#2e7d32' : note.status === 'cancelled' ? '#c62828' : '#f57c00'
                                              }}>
                                                {note.status}
                                              </span>
                                            </td>
                                            <td>{note.description || '-'}</td>
                                          </tr>
                                        ))}
                                        <tr className="payment-total-row">
                                          <td colSpan="2"><strong>Total Debit Notes</strong></td>
                                          <td><strong style={{color: '#d32f2f'}}>+{customer.debit_notes.reduce((sum, n) => sum + parseFloat(n.amount), 0).toFixed(2)}</strong></td>
                                          <td colSpan="3"></td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {/* Credit Notes Section */}
                                {customer.credit_notes && customer.credit_notes.length > 0 && (
                                  <div className="transactions-section" style={{marginTop: '20px'}}>
                                    <h5 style={{marginTop: '10px', marginBottom: '10px', color: '#1976d2'}}>
                                      📄 Customer Credit Notes 
                                      <span style={{fontSize: '12px', fontWeight: '400', color: '#666', marginLeft: '10px'}}>
                                        (Decreases what customer owes)
                                      </span>
                                    </h5>
                                    <table className="payment-history-table">
                                      <thead>
                                        <tr>
                                          <th>Date</th>
                                          <th>Credit Note #</th>
                                          <th>Amount</th>
                                          <th>Reason</th>
                                          <th>Status</th>
                                          <th>Description</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {customer.credit_notes.map(note => (
                                          <tr key={`credit-${note.id}`}>
                                            <td>{new Date(note.note_date).toLocaleDateString()}</td>
                                            <td><strong>{note.credit_note_number}</strong></td>
                                            <td style={{color: '#1976d2', fontWeight: '600'}}>-{parseFloat(note.amount).toFixed(2)}</td>
                                            <td>{note.reason}</td>
                                            <td>
                                              <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                backgroundColor: note.status === 'approved' ? '#e3f2fd' : note.status === 'cancelled' ? '#ffebee' : '#fff3e0',
                                                color: note.status === 'approved' ? '#1565c0' : note.status === 'cancelled' ? '#c62828' : '#f57c00'
                                              }}>
                                                {note.status}
                                              </span>
                                            </td>
                                            <td>{note.description || '-'}</td>
                                          </tr>
                                        ))}
                                        <tr className="payment-total-row">
                                          <td colSpan="2"><strong>Total Credit Notes</strong></td>
                                          <td><strong style={{color: '#1976d2'}}>-{customer.credit_notes.reduce((sum, n) => sum + parseFloat(n.amount), 0).toFixed(2)}</strong></td>
                                          <td colSpan="3"></td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {/* Net Balance Summary */}
                                {(customer.payment_history?.length > 0 || customer.debit_notes?.length > 0 || customer.credit_notes?.length > 0) && (
                                  <div style={{
                                    marginTop: '20px',
                                    padding: '15px',
                                    backgroundColor: '#f5f5f5',
                                    borderRadius: '8px',
                                    border: '2px solid #e0e0e0'
                                  }}>
                                    <h5 style={{marginTop: '0', marginBottom: '10px', color: '#333'}}>💼 Transaction Summary</h5>
                                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px'}}>
                                      <div>
                                        <div style={{fontSize: '12px', color: '#666', marginBottom: '5px'}}>Payments Received</div>
                                        <div style={{fontSize: '18px', fontWeight: '700', color: '#2e7d32'}}>
                                          {(customer.payment_history || []).reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}
                                        </div>
                                      </div>
                                      <div>
                                        <div style={{fontSize: '12px', color: '#666', marginBottom: '5px'}}>Debit Notes (Owed)</div>
                                        <div style={{fontSize: '18px', fontWeight: '700', color: '#d32f2f'}}>
                                          +{(customer.debit_notes || []).reduce((sum, n) => sum + parseFloat(n.amount), 0).toFixed(2)}
                                        </div>
                                      </div>
                                      <div>
                                        <div style={{fontSize: '12px', color: '#666', marginBottom: '5px'}}>Credit Notes (Refund)</div>
                                        <div style={{fontSize: '18px', fontWeight: '700', color: '#1976d2'}}>
                                          -{(customer.credit_notes || []).reduce((sum, n) => sum + parseFloat(n.amount), 0).toFixed(2)}
                                        </div>
                                      </div>
                                      <div style={{borderLeft: '3px solid #1976d2', paddingLeft: '15px'}}>
                                        <div style={{fontSize: '12px', color: '#666', marginBottom: '5px'}}>Net Balance</div>
                                        <div style={{fontSize: '20px', fontWeight: '700', color: parseFloat(customer.debit_credit_balance) > 0 ? '#d32f2f' : '#2e7d32'}}>
                                          {parseFloat(customer.debit_credit_balance) > 0 ? '+' : ''}{parseFloat(customer.debit_credit_balance || 0).toFixed(2)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {!customer.payment_history?.length && !customer.debit_notes?.length && !customer.credit_notes?.length && (
                                  <p className="no-payments-message">No transactions recorded for this customer in the selected period.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                      ));
                    })()
                  )}
                </tbody>
              </table>
              
              {reportData.length > 0 && (
                <div className="pagination-controls">
                  <div className="pagination-info">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, reportData.length)} of {reportData.length} customers
                  </div>
                  <div className="pagination-buttons">
                    <button 
                      className="btn-pagination" 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    <span className="page-indicator">Page {currentPage} of {Math.ceil(reportData.length / itemsPerPage)}</span>
                    <button 
                      className="btn-pagination"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(reportData.length / itemsPerPage)))}
                      disabled={currentPage === Math.ceil(reportData.length / itemsPerPage)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {reportType === 'vendors' && Array.isArray(reportData) && (
            <div className="vendor-report">
              <div className="report-header">
                <div>
                  <h2>Vendor Report</h2>
                  <p className="period">Period: {startDate} to {endDate}</p>
                </div>
                <button className="btn-print" onClick={handlePrintReport}>🖨️ Print Report</button>
              </div>
              
              {reportData.length > 0 && (
                <div className="summary-cards">
                  <div className="summary-card">
                    <div className="card-icon">🏭</div>
                    <div className="card-content">
                      <p className="card-label">Total Vendors</p>
                      <p className="card-value">{reportData.length}</p>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="card-icon">💰</div>
                    <div className="card-content">
                      <p className="card-label">Total Purchased</p>
                      <p className="card-value">{reportData.reduce((sum, v) => sum + (parseFloat(v.total_purchased) || 0), 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="card-icon">✅</div>
                    <div className="card-content">
                      <p className="card-label">Total Paid</p>
                      <p className="card-value">{reportData.reduce((sum, v) => sum + (parseFloat(v.paid_amount) || 0), 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="summary-card danger">
                    <div className="card-icon">⚠️</div>
                    <div className="card-content">
                      <p className="card-label">Total Due</p>
                      <p className="card-value">{reportData.reduce((sum, v) => sum + (parseFloat(v.due_amount) || 0), 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <table>
                <thead>
                  <tr>
                    <th>Vendor Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Orders</th>
                    <th>Total Purchased</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{textAlign: 'center', padding: '20px', color: '#718096'}}>
                        No vendor data found for the selected period
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedVendors = reportData.slice(startIndex, endIndex);
                      
                      return paginatedVendors.map(vendor => (
                        <React.Fragment key={vendor.id}>
                          <tr>
                            <td>{vendor.name}</td>
                            <td>{vendor.email}</td>
                            <td>{vendor.phone || '-'}</td>
                            <td>{vendor.total_orders}</td>
                            <td>{parseFloat(vendor.total_purchased).toFixed(2)}</td>
                            <td>{parseFloat(vendor.paid_amount).toFixed(2)}</td>
                            <td className="due">{parseFloat(vendor.due_amount).toFixed(2)}</td>
                            <td>
                              <button 
                                className="btn-view-payments"
                                onClick={() => setExpandedVendor(expandedVendor === vendor.id ? null : vendor.id)}
                              >
                                {expandedVendor === vendor.id ? '▼ Hide' : '▶ View'} Payments
                              </button>
                          </td>
                        </tr>
                        {expandedVendor === vendor.id && (
                          <tr className="payment-history-row">
                            <td colSpan="8">
                              <div className="payment-history-container">
                                <div className="payment-history-header">
                                  <h4>Payment History for {vendor.name}</h4>
                                  <button 
                                    className="btn-print-payments"
                                    onClick={() => handlePrintVendorPayments(vendor)}
                                    title="Print Payment History"
                                  >
                                    🖨️ Print
                                  </button>
                                </div>
                                
                                {/* Payments Section */}
                                {vendor.payment_history && vendor.payment_history.length > 0 ? (
                                  <div className="transactions-section">
                                    <h5 style={{marginTop: '10px', marginBottom: '10px', color: '#2e7d32'}}>💰 Payments Made</h5>
                                    <table className="payment-history-table">
                                      <thead>
                                        <tr>
                                          <th>Date</th>
                                          <th>PO Number</th>
                                          <th>Amount Paid</th>
                                          <th>Payment Method</th>
                                          <th>Reference</th>
                                          <th>Notes</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {vendor.payment_history.map(payment => (
                                          <tr key={`payment-${payment.id}`}>
                                            <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
                                            <td>{payment.po_number || 'N/A'}</td>
                                            <td style={{color: '#2e7d32', fontWeight: '600'}}>{parseFloat(payment.amount).toFixed(2)}</td>
                                            <td>{payment.payment_method}</td>
                                            <td>{payment.reference_number || '-'}</td>
                                            <td>{payment.notes || '-'}</td>
                                          </tr>
                                        ))}
                                        <tr className="payment-total-row">
                                          <td colSpan="2"><strong>Total Payments</strong></td>
                                          <td><strong style={{color: '#2e7d32'}}>{vendor.payment_history.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}</strong></td>
                                          <td colSpan="3"></td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="no-payments-message">No payments recorded for this vendor in the selected period.</p>
                                )}

                                {/* Debit Notes Section */}
                                {vendor.debit_notes && vendor.debit_notes.length > 0 && (
                                  <div className="transactions-section" style={{marginTop: '20px'}}>
                                    <h5 style={{marginTop: '10px', marginBottom: '10px', color: '#d32f2f'}}>
                                      📋 Vendor Debit Notes 
                                      <span style={{fontSize: '12px', fontWeight: '400', color: '#666', marginLeft: '10px'}}>
                                        (Reduces what we owe)
                                      </span>
                                    </h5>
                                    <table className="payment-history-table">
                                      <thead>
                                        <tr>
                                          <th>Date</th>
                                          <th>Debit Note #</th>
                                          <th>Amount</th>
                                          <th>Reason</th>
                                          <th>Status</th>
                                          <th>Description</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {vendor.debit_notes.map(note => (
                                          <tr key={`debit-${note.id}`}>
                                            <td>{new Date(note.note_date).toLocaleDateString()}</td>
                                            <td>{note.debit_note_number}</td>
                                            <td style={{color: '#d32f2f', fontWeight: '600'}}>-{parseFloat(note.amount).toFixed(2)}</td>
                                            <td>{note.reason}</td>
                                            <td>
                                              <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                backgroundColor: note.status === 'approved' ? '#e8f5e9' : note.status === 'cancelled' ? '#ffebee' : '#fff3e0',
                                                color: note.status === 'approved' ? '#2e7d32' : note.status === 'cancelled' ? '#c62828' : '#f57c00'
                                              }}>
                                                {note.status}
                                              </span>
                                            </td>
                                            <td>{note.description || '-'}</td>
                                          </tr>
                                        ))}
                                        <tr className="payment-total-row">
                                          <td colSpan="2"><strong>Total Debit Notes</strong></td>
                                          <td><strong style={{color: '#d32f2f'}}>-{vendor.debit_notes.reduce((sum, n) => sum + parseFloat(n.amount), 0).toFixed(2)}</strong></td>
                                          <td colSpan="3"></td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {/* Credit Notes Section */}
                                {vendor.credit_notes && vendor.credit_notes.length > 0 && (
                                  <div className="transactions-section" style={{marginTop: '20px'}}>
                                    <h5 style={{marginTop: '10px', marginBottom: '10px', color: '#1976d2'}}>
                                      📝 Vendor Credit Notes 
                                      <span style={{fontSize: '12px', fontWeight: '400', color: '#666', marginLeft: '10px'}}>
                                        (Increases what we owe)
                                      </span>
                                    </h5>
                                    <table className="payment-history-table">
                                      <thead>
                                        <tr>
                                          <th>Date</th>
                                          <th>Credit Note #</th>
                                          <th>Amount</th>
                                          <th>Reason</th>
                                          <th>Status</th>
                                          <th>Description</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {vendor.credit_notes.map(note => (
                                          <tr key={`credit-${note.id}`}>
                                            <td>{new Date(note.note_date).toLocaleDateString()}</td>
                                            <td>{note.credit_note_number}</td>
                                            <td style={{color: '#1976d2', fontWeight: '600'}}>+{parseFloat(note.amount).toFixed(2)}</td>
                                            <td>{note.reason}</td>
                                            <td>
                                              <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                backgroundColor: note.status === 'approved' ? '#e8f5e9' : note.status === 'cancelled' ? '#ffebee' : '#fff3e0',
                                                color: note.status === 'approved' ? '#2e7d32' : note.status === 'cancelled' ? '#c62828' : '#f57c00'
                                              }}>
                                                {note.status}
                                              </span>
                                            </td>
                                            <td>{note.description || '-'}</td>
                                          </tr>
                                        ))}
                                        <tr className="payment-total-row">
                                          <td colSpan="2"><strong>Total Credit Notes</strong></td>
                                          <td><strong style={{color: '#1976d2'}}>+{vendor.credit_notes.reduce((sum, n) => sum + parseFloat(n.amount), 0).toFixed(2)}</strong></td>
                                          <td colSpan="3"></td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {/* Net Balance Summary */}
                                {(vendor.payment_history?.length > 0 || vendor.debit_notes?.length > 0 || vendor.credit_notes?.length > 0) && (
                                  <div style={{
                                    marginTop: '20px',
                                    padding: '15px',
                                    backgroundColor: '#f5f5f5',
                                    borderRadius: '8px',
                                    border: '2px solid #e0e0e0'
                                  }}>
                                    <h5 style={{marginTop: '0', marginBottom: '10px', color: '#333'}}>💼 Transaction Summary</h5>
                                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px'}}>
                                      <div>
                                        <div style={{fontSize: '12px', color: '#666', marginBottom: '5px'}}>Payments Made</div>
                                        <div style={{fontSize: '18px', fontWeight: '700', color: '#2e7d32'}}>
                                          {(vendor.payment_history || []).reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}
                                        </div>
                                      </div>
                                      <div>
                                        <div style={{fontSize: '12px', color: '#666', marginBottom: '5px'}}>Debit Notes (Reduce)</div>
                                        <div style={{fontSize: '18px', fontWeight: '700', color: '#d32f2f'}}>
                                          -{(vendor.debit_notes || []).reduce((sum, n) => sum + parseFloat(n.amount), 0).toFixed(2)}
                                        </div>
                                      </div>
                                      <div>
                                        <div style={{fontSize: '12px', color: '#666', marginBottom: '5px'}}>Credit Notes (Add)</div>
                                        <div style={{fontSize: '18px', fontWeight: '700', color: '#1976d2'}}>
                                          +{(vendor.credit_notes || []).reduce((sum, n) => sum + parseFloat(n.amount), 0).toFixed(2)}
                                        </div>
                                      </div>
                                      <div style={{borderLeft: '3px solid #1976d2', paddingLeft: '15px'}}>
                                        <div style={{fontSize: '12px', color: '#666', marginBottom: '5px'}}>Net Balance</div>
                                        <div style={{fontSize: '20px', fontWeight: '700', color: parseFloat(vendor.debit_credit_balance) > 0 ? '#d32f2f' : '#2e7d32'}}>
                                          {parseFloat(vendor.debit_credit_balance) > 0 ? '+' : ''}{parseFloat(vendor.debit_credit_balance || 0).toFixed(2)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {!vendor.payment_history?.length && !vendor.debit_notes?.length && !vendor.credit_notes?.length && (
                                  <p className="no-payments-message">No transactions recorded for this vendor in the selected period.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                      ));
                    })()
                  )}
                </tbody>
              </table>
              
              {reportData.length > 0 && (
                <div className="pagination-controls">
                  <div className="pagination-info">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, reportData.length)} of {reportData.length} vendors
                  </div>
                  <div className="pagination-buttons">
                    <button 
                      className="btn-pagination" 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    <span className="page-indicator">Page {currentPage} of {Math.ceil(reportData.length / itemsPerPage)}</span>
                    <button 
                      className="btn-pagination"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(reportData.length / itemsPerPage)))}
                      disabled={currentPage === Math.ceil(reportData.length / itemsPerPage)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {reportType === 'inventory' && Array.isArray(reportData) && (
            <div className="inventory-report">
              <div className="report-header">
                <h2>Inventory Report</h2>
                <button className="btn-print" onClick={handlePrintReport}>🖨️ Print Report</button>
              </div>
              
              {reportData.length > 0 && (
                <div className="summary-cards">
                  <div className="summary-card">
                    <div className="card-icon">📦</div>
                    <div className="card-content">
                      <p className="card-label">Total Products</p>
                      <p className="card-value">{reportData.length}</p>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="card-icon">📊</div>
                    <div className="card-content">
                      <p className="card-label">Total On Hand</p>
                      <p className="card-value">{reportData.reduce((sum, p) => sum + (parseInt(p.quantity_on_hand) || 0), 0)}</p>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="card-icon">💼</div>
                    <div className="card-content">
                      <p className="card-label">Inventory Value</p>
                      <p className="card-value">{reportData.reduce((sum, p) => sum + (parseFloat(p.inventory_value) || 0), 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="card-icon">💵</div>
                    <div className="card-content">
                      <p className="card-label">Retail Value</p>
                      <p className="card-value">{reportData.reduce((sum, p) => sum + (parseFloat(p.retail_value) || 0), 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>On Hand</th>
                    <th>Inventory Value</th>
                    <th>Retail Value</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{textAlign: 'center', padding: '20px', color: '#718096'}}>
                        No inventory data found
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedInventory = reportData.slice(startIndex, endIndex);
                      
                      return paginatedInventory.map(product => (
                        <tr key={product.id}>
                          <td>{product.name}</td>
                          <td>{product.category}</td>
                          <td>{product.quantity_on_hand}</td>
                          <td>{parseFloat(product.inventory_value).toFixed(2)}</td>
                          <td>{parseFloat(product.retail_value).toFixed(2)}</td>
                        </tr>
                      ));
                    })()
                  )}
                </tbody>
              </table>
              
              {reportData.length > 0 && (
                <div className="pagination-controls">
                  <div className="pagination-info">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, reportData.length)} of {reportData.length} products
                  </div>
                  <div className="pagination-buttons">
                    <button 
                      className="btn-pagination" 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    <span className="page-indicator">Page {currentPage} of {Math.ceil(reportData.length / itemsPerPage)}</span>
                    <button 
                      className="btn-pagination"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(reportData.length / itemsPerPage)))}
                      disabled={currentPage === Math.ceil(reportData.length / itemsPerPage)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Reports;
