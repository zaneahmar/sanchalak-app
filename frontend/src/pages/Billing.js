import React, { useState, useEffect } from 'react';
import '../styles/Billing.css';
import { billingAPI } from '../services/api';
import { useToaster } from '../context/ToasterContext';

const Billing = () => {
  const [dateFilter, setDateFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { success, error: showError, info } = useToaster();

  // Fetch invoices from API
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await billingAPI.getAll();
        console.log('Raw billing data:', data);
        console.log('First invoice fields:', data[0] ? Object.keys(data[0]) : 'No data');
        
        // Transform billing data to invoice format
        const transformedInvoices = data.map((billing) => ({
          id: billing.id, // Database ID for API calls
          invoiceNumber: billing.invoice_number, // Invoice number for display
          customer: billing.customer_name || 'Unknown',
          date: new Date(billing.created_at).toISOString().split('T')[0],
          dueDate: billing.due_date ? new Date(billing.due_date).toISOString().split('T')[0] : null,
          paymentMethod: (billing.payment_method || 'Cash').trim(),
          status: (billing.status || 'unpaid').toLowerCase(),
          amount: parseFloat(billing.amount) || 0,
          subtotal: parseFloat(billing.subtotal) || 0,
          gstAmount: parseFloat(billing.gst_amount) || 0,
          gstRate: parseFloat(billing.gst_rate) || 18,
          items: [] // Billing table doesn't include items directly
        }));
        
        console.log('First transformed invoice:', transformedInvoices[0] ? transformedInvoices[0] : 'No invoices');
        console.log('Fetched invoices:', transformedInvoices);
        console.log('Unique payment methods:', [...new Set(transformedInvoices.map(inv => inv.paymentMethod))]);
        setInvoices(transformedInvoices);
      } catch (err) {
        console.error('Failed to fetch invoices:', err);
        setError('Failed to load invoices. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + item.qty * item.price, 0);
  };

  const calculateCost = (items) => {
    return items.reduce((sum, item) => sum + item.qty * (item.cost || 0), 0);
  };

  const calculateProfit = (items) => {
    return calculateTotal(items) - calculateCost(items);
  };

  const calculateProfitMargin = (items) => {
    const total = calculateTotal(items);
    if (total === 0) return 0;
    return Math.round((calculateProfit(items) / total) * 100);
  };

  const calculateGST = (amount) => {
    const GST_RATE = 0.18;
    const subtotal = amount / (1 + GST_RATE);
    return amount - subtotal;
  };

  const calculateSubtotal = (amount) => {
    const GST_RATE = 0.18;
    return amount / (1 + GST_RATE);
  };

  const handleDownload = async (invoice) => {
    try {
      info('Downloading invoice...');
      // Use the billing API's downloadPDF method with database id and invoice number for filename
      await billingAPI.downloadPDF(invoice.id, invoice.invoiceNumber);
      success('Invoice downloaded successfully!');
    } catch (error) {
      console.error('Download failed:', error);
      showError('Failed to download invoice. Please try again.');
    }
  };

  const handlePrint = async (invoice) => {
    try {
      info('Preparing invoice for printing...');
      // Use the billing API's printPDF method to open PDF and trigger print dialog
      await billingAPI.printPDF(invoice.id, invoice.invoiceNumber);
      success('Print dialog opened!');
    } catch (error) {
      console.error('Print failed:', error);
      showError('Failed to print invoice. Please try again.');
    }
  };

  const handleViewInvoice = async (invoice) => {
    try {
      // Fetch items for the invoice
      const items = await fetchInvoiceItems(invoice.id);
      
      // Create a detailed invoice with items
      const detailedInvoice = {
        ...invoice,
        items: items
      };
      
      console.log("detailedInvoice with items:", detailedInvoice);
      setSelectedInvoice(detailedInvoice);
    } catch (error) {
      console.error('Failed to load invoice details:', error);
      // Fallback to showing basic invoice without items
      setSelectedInvoice(invoice);
    }
  };

  const fetchInvoiceItems = async (billingId) => {
    try {
      // Get billing record with order/sale info
      const billingDetail = await billingAPI.getById(billingId);
      console.log("Billing detail:", billingDetail);
      
      if (billingDetail.order_id) {
        // Fetch order with items using authenticated API call
        const url = `${process.env.REACT_APP_API_URL || 'http://192.168.1.3:5000/api'}/orders/${billingDetail.order_id}`;
        const token = localStorage.getItem('authToken');
        console.log("Fetching order from URL:", url);
        
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch order: ${response.status}`);
        }
        
        const orderData = await response.json();
        console.log("Order data:", orderData);
        
        // Map order items to invoice item format
        const mappedItems = (orderData.items || []).map(item => ({
          item: item.product_name || 'Unknown',
          qty: item.quantity,
          price: item.unit_price,
          cost: item.cost || 0
        }));
        
        console.log("Mapped items from order:", mappedItems);
        return mappedItems;
      } else if (billingDetail.sale_id) {
        // Fetch sale items with authenticated API call
        const saleUrl = `${process.env.REACT_APP_API_URL || 'http://192.168.1.3:5000/api'}/sales/${billingDetail.sale_id}`;
        const token = localStorage.getItem('authToken');
        console.log("Fetching sale from URL:", saleUrl);
        
        const saleResponse = await fetch(saleUrl, {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        });
        
        if (!saleResponse.ok) {
          throw new Error(`Failed to fetch sale: ${saleResponse.status}`);
        }
        
        const saleData = await saleResponse.json();
        console.log("Sale data:", saleData);
        
        // Map sale items to invoice item format
        const mappedItems = (saleData.items || []).map(item => ({
          item: item.product_name || 'Unknown',
          qty: item.quantity,
          price: item.unit_price,
          cost: item.cost || 0
        }));
        
        console.log("Mapped items from sale:", mappedItems);
        return mappedItems;
      }
      
      console.warn("No order_id or sale_id found in billing detail");
      return [];
    } catch (error) {
      console.error('Failed to fetch invoice items:', error);
      return [];
    }
  };

  const getDateRange = (filter) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case 'thisWeek':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
        return { start: startOfWeek, end: endOfWeek };
      case 'thisMonth':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return { start: startOfMonth, end: endOfMonth };
      default:
        return { start: null, end: null };
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    // Filter by date
    if (dateFilter !== 'all') {
      const { start, end } = getDateRange(dateFilter);
      const invoiceDate = new Date(invoice.date);
      if (invoiceDate < start || invoiceDate >= end) {
        return false;
      }
    }

    // Filter by payment method (case-insensitive)
    if (paymentFilter !== 'all') {
      if (invoice.paymentMethod.toLowerCase() !== paymentFilter.toLowerCase()) {
        return false;
      }
    }

    // Filter by search text
    if (searchText !== '' && !invoice.customer.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }

    return true;
  });

  return (
    <div className="billing">
      <h1>Billing</h1>

      {/* FILTERS */}
      <div className="billing-filters">
        <div className="filter-group">
          <label>Date</label>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="today">Today</option>
            <option value="thisWeek">This Week</option>
            <option value="thisMonth">This Month</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Payment Method</label>
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Search Customer</label>
          <input
            type="text"
            placeholder="Enter customer name"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* SUMMARY */}
      <div className="billing-summary">
        <div className="summary-card revenue">
          <h3>Total Revenue</h3>
          <div className="amount"> {filteredInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0).toFixed(2)}</div>
        </div>

        <div className="summary-card cost">
          <h3>Total Paid</h3>
          <div className="amount"> {filteredInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.amount || 0), 0).toFixed(2)}</div>
        </div>

        <div className="summary-card profit">
          <h3>Total Unpaid</h3>
          <div className="amount"> {filteredInvoices.filter(inv => inv.status === 'unpaid' || inv.status === 'partial').reduce((sum, inv) => sum + (inv.amount || 0), 0).toFixed(2)}</div>
        </div>

        <div className="summary-card margin">
          <h3>Total Invoices</h3>
          <div className="amount">{filteredInvoices.length}</div>
        </div>
      </div>

      {/* INVOICES TABLE */}
      <div className="invoices-list">
        <h2>Invoices</h2>

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Loading invoices...</p>
          </div>
        )}

        {error && (
          <div style={{ 
            textAlign: 'center', 
            padding: '20px', 
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Payment</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.invoiceNumber}</td>
                  <td>{invoice.customer}</td>
                  <td>{invoice.date}</td>
                  <td>{invoice.dueDate ? invoice.dueDate : 'N/A'}</td>
                  <td>{invoice.paymentMethod}</td>
                  <td> {(invoice.amount || 0).toFixed(2)}</td>
                  <td>
                    <span className={`status ${invoice.status}`}>
                      {invoice.status && invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-action view" onClick={() => handleViewInvoice(invoice)}>
                        View
                      </button>
                      <button className="btn-action download" onClick={() => handleDownload(invoice)}>
                        Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center" }}>
                    No invoices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content invoice-modal">
            <div className="modal-header">
              <h2>Invoice - {selectedInvoice.invoiceNumber}</h2>
              <button className="close-btn" onClick={() => setSelectedInvoice(null)}>×</button>
            </div>

            <div className="modal-body">
              <div className="invoice-container">
                <div className="invoice-header">
                  <h1>Invoice</h1>
                  <p>{selectedInvoice.customer}</p>
                </div>

                <div className="invoice-details-row">
                  <div className="invoice-col">
                    <strong>Invoice ID</strong>
                    <p>{selectedInvoice.invoiceNumber}</p>
                  </div>

                  <div className="invoice-col">
                    <strong>Date</strong>
                    <p>{selectedInvoice.date}</p>
                  </div>

                  <div className="invoice-col">
                    <strong>Status</strong>
                    <p>
                      <span className={`status ${selectedInvoice.status}`}>
                        {selectedInvoice.status && selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                      </span>
                    </p>
                  </div>
                </div>

                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                      selectedInvoice.items.map((item, index) => {
                        const qty = parseFloat(item.qty) || 0;
                        const price = parseFloat(item.price) || 0;
                        const amount = qty * price;
                        
                        return (
                          <tr key={index}>
                            <td>{item.item || 'Unknown'}</td>
                            <td>{qty}</td>
                            <td> {price.toFixed(2)}</td>
                            <td> {amount.toFixed(2)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="4" style={{textAlign: 'center'}}>
                          Items details available in PDF download
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="invoice-totals">
                  <div className="total-row">
                    <span>Subtotal</span>
                    <span> {(selectedInvoice.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="total-row">
                    <span>GST ({selectedInvoice.gstRate || 18}%)</span>
                    <span> {(selectedInvoice.gstAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="total-row grand-total">
                    <span>Total Amount (Including GST)</span>
                    <span> {(selectedInvoice.amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => handlePrint(selectedInvoice)}>
                Print
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Billing;
