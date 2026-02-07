import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import '../styles/Payments.css';

function Payments() {
  const [payments, setPayments] = useState([]);
  const [billings, setBillings] = useState([]);
  const [allBillings, setAllBillings] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [unPaidPOs, setUnPaidPOs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [duesSummary, setDuesSummary] = useState([]);
  const [overdueDues, setOverdueDues] = useState([]);
  const [activeTab, setActiveTab] = useState('payments'); // 'payments', 'dues', 'overdue'
  const [showForm, setShowForm] = useState(false);
  const [paymentType, setPaymentType] = useState('customer'); // 'customer' or 'vendor'
  const [filters, setFilters] = useState({
    paymentStatus: '',
    paymentMethod: '',
    searchTerm: '',
  });
  const [formData, setFormData] = useState({
    billing_id: '',
    po_id: '',
    amount: 0,
    payment_method: 'cash',
    reference_number: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, billingsRes, duesRes, overdueRes, posRes, vendorsRes, customersRes] = await Promise.all([
        api.get('/payments'),
        api.get('/billing'),
        api.get('/payments/summary/dues'),
        api.get('/payments/overdue/list?days=7'),
        api.get('/purchase-orders'),
        api.get('/vendors'),
        api.get('/customers'),
      ]);
      
      setPayments(paymentsRes || []);
      
      const billingData = Array.isArray(billingsRes) ? billingsRes : (billingsRes.data || []);
      setAllBillings(billingData);
      
      const unpaidBillings = billingData.filter(b => b.status === 'unpaid' || b.status === 'partial');
      setBillings(unpaidBillings.length > 0 ? unpaidBillings : billingData);
      
      const posData = Array.isArray(posRes) ? posRes : (posRes.data || []);
      setPurchaseOrders(posData);
      
      // Filter POs that have pending/partial payment (not fully paid)
      const unpaidPos = posData.filter(po => {
        const paidAmount = (paymentsRes || [])
          .filter(p => p.po_id === po.id && p.status === 'completed')
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        return parseFloat(po.total_amount) > paidAmount;
      });
      setUnPaidPOs(unpaidPos);
      
      const vendorsData = Array.isArray(vendorsRes) ? vendorsRes : (vendorsRes.data || []);
      setVendors(vendorsData);
      
      const customersData = Array.isArray(customersRes) ? customersRes : (customersRes.data || []);
      setCustomers(customersData);
      
      setDuesSummary(Array.isArray(duesRes) ? duesRes : []);
      setOverdueDues(Array.isArray(overdueRes) ? overdueRes : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setPayments([]);
      setBillings([]);
      setAllBillings([]);
      setPurchaseOrders([]);
      setUnPaidPOs([]);
      setVendors([]);
      setCustomers([]);
      setDuesSummary([]);
      setOverdueDues([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'po_id' && value) {
      const selectedPO = unPaidPOs.find(po => po.id === parseInt(value));
      if (selectedPO) {
        // Calculate remaining amount due
        const paidAmount = payments
          .filter(p => p.po_id === parseInt(value) && p.status === 'completed')
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const remainingDue = parseFloat(selectedPO.total_amount) - paidAmount;
        
        setFormData(prev => ({
          ...prev,
          po_id: value,
          billing_id: '',
          amount: Math.max(0, remainingDue),
          payment_method: 'bank_transfer',
        }));
        return;
      }
    }
    
    if (name === 'billing_id' && value) {
      const selectedBilling = billings.find(b => b.id === parseInt(value));
      if (selectedBilling) {
        // Calculate remaining amount due
        const paidAmount = payments
          .filter(p => p.billing_id === parseInt(value) && p.status === 'completed')
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const remainingDue = parseFloat(selectedBilling.amount) - paidAmount;
        
        setFormData(prev => ({
          ...prev,
          billing_id: value,
          po_id: '',
          amount: Math.max(0, remainingDue),
          payment_method: selectedBilling.payment_method || 'cash',
          reference_number: selectedBilling.sale_id ? `SALE-${selectedBilling.sale_id}` : '',
        }));
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const paymentData = {
        amount: formData.amount,
        payment_method: formData.payment_method,
        reference_number: formData.reference_number,
        notes: formData.notes,
      };

      if (paymentType === 'customer') {
        paymentData.billing_id = parseInt(formData.billing_id);
      } else {
        paymentData.po_id = parseInt(formData.po_id);
      }

      await api.post('/payments', paymentData);
      setFormData({
        billing_id: '',
        po_id: '',
        amount: 0,
        payment_method: 'cash',
        reference_number: '',
        notes: '',
      });
      setShowForm(false);
      setPaymentType('customer');
      fetchData();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      try {
        await api.delete(`/payments/${id}`);
        fetchData();
      } catch (error) {
        console.error('Error deleting payment:', error);
        alert('Error deleting payment: ' + error.message);
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'paid': { bg: '#4CAF50', text: 'Paid' },
      'partial': { bg: '#FFC107', text: 'Partial' },
      'unpaid': { bg: '#F44336', text: 'Unpaid' },
      'overdue': { bg: '#D32F2F', text: 'Overdue' }
    };
    return statusMap[status] || { bg: '#999', text: status };
  };

  const getFilteredPayments = () => {
    return payments.filter(payment => {
      // Filter by payment status
      if (filters.paymentStatus && payment.status !== filters.paymentStatus) {
        return false;
      }
      
      // Filter by payment method
      if (filters.paymentMethod && payment.payment_method !== filters.paymentMethod) {
        return false;
      }
      
      // Search by customer or vendor name
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const customerName = (payment.customer_name || '').toLowerCase();
        const vendorName = (payment.vendor_name || '').toLowerCase();
        if (!customerName.includes(searchLower) && !vendorName.includes(searchLower)) {
          return false;
        }
      }
      
      return true;
    });
  };

  const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const customerDues = duesSummary.find(d => d.type === 'customer_dues');
  const vendorDues = duesSummary.find(d => d.type === 'vendor_dues');
  const totalCustomerDues = customerDues?.total_dues || 0;
  const totalVendorDues = vendorDues?.total_dues || 0;

  return (
    <div className="payments-page">
      <div className="payments-header">
        <h1>Payment & Dues Management</h1>
        <button 
          className="btn-primary" 
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancel' : '+ Record Payment'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="dues-summary-cards">
        <div className="summary-card">
          <h3>Total Payments (This Period)</h3>
          <p className="summary-amount">{parseFloat(totalPayments).toFixed(2)}</p>
          <span className="summary-count">{payments.length} transactions</span>
        </div>
        <div className="summary-card warning">
          <h3>Customer Dues</h3>
          <p className="summary-amount">{parseFloat(totalCustomerDues).toFixed(2)}</p>
          <span className="summary-count">
            {customerDues?.count || 0} customers
          </span>
          
        </div>
        <div className="summary-card danger">
          <h3>Vendor Dues</h3>
          <p className="summary-amount">{parseFloat(totalVendorDues).toFixed(2)}</p>
          <span className="summary-count">
            {vendorDues?.count || 0} vendors
          </span>
        </div>
        <div className="summary-card danger">
          <h3>Overdue Dues (7+ days)</h3>
          <p className="summary-amount">{overdueDues.reduce((sum, o) => sum + parseFloat(o.total_due || 0), 0).toFixed(2)}</p>
          <span className="summary-count">{overdueDues.length} overdue</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          Payment Records
        </button>
        <button 
          className={`tab ${activeTab === 'dues' ? 'active' : ''}`}
          onClick={() => setActiveTab('dues')}
        >
          Outstanding Dues
        </button>
        <button 
          className={`tab ${activeTab === 'overdue' ? 'active' : ''}`}
          onClick={() => setActiveTab('overdue')}
        >
          Overdue Amounts
        </button>
      </div>

      {/* Payment Form */}
      {showForm && activeTab === 'payments' && (
        <>
          {/* Payment Type Selector */}
          <div className="payment-type-tabs">
            <button 
              className={`type-tab ${paymentType === 'customer' ? 'active' : ''}`}
              onClick={() => {
                setPaymentType('customer');
                setFormData(prev => ({ ...prev, po_id: '', billing_id: '' }));
              }}
            >
              Customer Payment (Invoice)
            </button>
            <button 
              className={`type-tab ${paymentType === 'vendor' ? 'active' : ''}`}
              onClick={() => {
                setPaymentType('vendor');
                setFormData(prev => ({ ...prev, billing_id: '', po_id: '' }));
              }}
            >
              Vendor Payment (PO)
            </button>
          </div>

          <form className="payment-form" onSubmit={handleSubmit}>
            {paymentType === 'customer' && billings.length === 0 && (
              <div className="alert alert-info">
                {allBillings.length === 0 
                  ? 'No invoices available. Create invoices in the Billing section first.' 
                  : 'No unpaid invoices available. All invoices have been paid.'}
              </div>
            )}
            {paymentType === 'vendor' && unPaidPOs.length === 0 && (
              <div className="alert alert-info">
                {purchaseOrders.length === 0 
                  ? 'No purchase orders available.' 
                  : 'No unpaid purchase orders. All orders have been paid.'}
              </div>
            )}
            <div className="form-grid">
              {paymentType === 'customer' && (
                <div className="form-group">
                  <label>Select Invoice *</label>
                  <select
                    name="billing_id"
                    value={formData.billing_id}
                    onChange={handleInputChange}
                    required={paymentType === 'customer'}
                    disabled={billings.length === 0}
                  >
                    <option value="">
                      {billings.length === 0 ? 'No invoices available' : 'Select Invoice'}
                    </option>
                    {billings.map(b => {
                      const paidAmount = payments
                        .filter(p => p.billing_id === b.id && p.status === 'completed')
                        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                      const remaining = parseFloat(b.amount) - paidAmount;
                      return (
                        <option key={b.id} value={b.id}>
                          {b.invoice_number} - {b.customer_name} | Due: {remaining.toFixed(2)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
              {paymentType === 'vendor' && (
                <div className="form-group">
                  <label>Select Purchase Order *</label>
                  <select
                    name="po_id"
                    value={formData.po_id}
                    onChange={handleInputChange}
                    required={paymentType === 'vendor'}
                    disabled={unPaidPOs.length === 0}
                  >
                    <option value="">
                      {unPaidPOs.length === 0 ? 'No POs available' : 'Select PO'}
                    </option>
                    {unPaidPOs.map(po => {
                      const paidAmount = payments
                        .filter(p => p.po_id === po.id && p.status === 'completed')
                        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                      const vendor = vendors.find(v => v.id === po.vendor_id);
                      const remaining = parseFloat(po.total_amount) - paidAmount;
                      return (
                        <option key={po.id} value={po.id}>
                          {po.po_number} - {vendor?.name} | Due: {remaining.toFixed(2)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Amount *</label>
                <input
                  type="number"
                  name="amount"
                  placeholder="Amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  step="0.01"
                  required
                />
                {(formData.billing_id || formData.po_id) && (
                  <div className="remaining-info" style={{marginTop: '8px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px', fontSize: '14px'}}>
                    {paymentType === 'customer' && billings.find(b => b.id === parseInt(formData.billing_id)) && (() => {
                      const billing = billings.find(b => b.id === parseInt(formData.billing_id));
                      const paidAmount = payments
                        .filter(p => p.billing_id === billing.id && p.status === 'completed')
                        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                      const totalDue = parseFloat(billing.amount);
                      const remainingAfterPayment = totalDue - paidAmount - parseFloat(formData.amount || 0);
                      return (
                        <>
                          <div>Total Due: <strong>{totalDue.toFixed(2)}</strong></div>
                          <div>Already Paid: <strong>{paidAmount.toFixed(2)}</strong></div>
                          <div>Payment: <strong>{parseFloat(formData.amount || 0).toFixed(2)}</strong></div>
                          <div style={{borderTop: '1px solid #ddd', marginTop: '8px', paddingTop: '8px', color: remainingAfterPayment > 0 ? '#f44336' : '#4caf50'}}>
                            Remaining After Payment: <strong>{Math.max(0, remainingAfterPayment).toFixed(2)}</strong>
                          </div>
                        </>
                      );
                    })()}
                    {paymentType === 'vendor' && unPaidPOs.find(po => po.id === parseInt(formData.po_id)) && (() => {
                      const po = unPaidPOs.find(po => po.id === parseInt(formData.po_id));
                      const paidAmount = payments
                        .filter(p => p.po_id === po.id && p.status === 'completed')
                        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                      const totalDue = parseFloat(po.total_amount);
                      const remainingAfterPayment = totalDue - paidAmount - parseFloat(formData.amount || 0);
                      return (
                        <>
                          <div>Total Due: <strong>{totalDue.toFixed(2)}</strong></div>
                          <div>Already Paid: <strong>{paidAmount.toFixed(2)}</strong></div>
                          <div>Payment: <strong>{parseFloat(formData.amount || 0).toFixed(2)}</strong></div>
                          <div style={{borderTop: '1px solid #ddd', marginTop: '8px', paddingTop: '8px', color: remainingAfterPayment > 0 ? '#f44336' : '#4caf50'}}>
                            Remaining After Payment: <strong>{Math.max(0, remainingAfterPayment).toFixed(2)}</strong>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleInputChange}
                >
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
              <div className="form-group">
                <label>Reference Number</label>
                <input
                  type="text"
                  name="reference_number"
                  placeholder="Reference Number"
                  value={formData.reference_number}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                placeholder="Notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
              />
            </div>
            <button type="submit" className="btn-submit">Record Payment</button>
          </form>
        </>
      )}

      {/* Payment Records Tab */}
      {activeTab === 'payments' && (
        <div className="payments-table">
          <h3>Recent Payments</h3>
          <div className="filters-section">
            <div className="filter-group">
              <label>Search Customer</label>
              <input
                type="text"
                placeholder="Search customer name..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <label>Status</label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Payment Method</label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                className="filter-select"
              >
                <option value="">All Payment Methods</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit_card">Credit Card</option>
                <option value="upi">UPI</option>
              </select>
            </div>
          </div>

          {getFilteredPayments().length === 0 ? (
            <p className="no-data">No payment records found</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredPayments().map(payment => (
                  <tr key={payment.id}>
                    <td><strong>{payment.invoice_number || payment.po_number}</strong></td>
                    <td>{payment.customer_name || payment.vendor_name || 'N/A'}</td>
                    <td className="amount">{parseFloat(payment.amount).toFixed(2)}</td>
                    <td>{payment.payment_method}</td>
                    <td>{payment.reference_number || 'N/A'}</td>
                    <td>{new Date(payment.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className="status-badge" style={{backgroundColor: getStatusBadge(payment.status).bg}}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="actions">
                      <button 
                        className="btn-delete" 
                        onClick={() => handleDelete(payment.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Outstanding Dues Tab */}
      {activeTab === 'dues' && (
        <div className="dues-table">
          <h3>Outstanding Dues</h3>
          
          {/* Customer Dues Section */}
          <div className="dues-section">
            <h4>Customer Dues (Invoices)</h4>
            {allBillings.filter(b => b.status === 'unpaid' || b.status === 'partial').length === 0 ? (
              <p className="no-data">No outstanding customer dues</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Total Amount</th>
                    <th>Paid</th>
                    <th>Pending</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allBillings
                    .filter(b => b.status === 'unpaid' || b.status === 'partial')
                    .map(billing => {
                      const paidAmount = payments
                        .filter(p => p.billing_id === billing.id && p.status === 'completed')
                        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                      const pendingAmount = parseFloat(billing.amount) - paidAmount;
                      
                      return (
                        <tr key={`billing-${billing.id}`}>
                          <td><strong>{billing.invoice_number}</strong></td>
                          <td>{billing.customer_name}</td>
                          <td className="amount">{parseFloat(billing.amount).toFixed(2)}</td>
                          <td className="amount paid">{paidAmount.toFixed(2)}</td>
                          <td className="amount pending">{pendingAmount.toFixed(2)}</td>
                          <td>{billing.due_date ? new Date(billing.due_date).toLocaleDateString() : 'N/A'}</td>
                          <td>
                            <span className="status-badge" style={{backgroundColor: getStatusBadge(billing.status).bg}}>
                              {billing.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>

          {/* Customer Debit/Credit Notes Balance */}
          <div className="dues-section">
            <h4>Customer Debit/Credit Note Balances</h4>
            {customers.filter(c => c.debit_credit_balance && parseFloat(c.debit_credit_balance) !== 0).length === 0 ? (
              <p className="no-data">No customer debit/credit note balances</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Balance Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {customers
                    .filter(c => c.debit_credit_balance && parseFloat(c.debit_credit_balance) !== 0)
                    .map(customer => {
                      const balance = parseFloat(customer.debit_credit_balance);
                      const isDebit = balance > 0;
                      return (
                        <tr key={`customer-balance-${customer.id}`}>
                          <td><strong>{customer.name}</strong></td>
                          <td style={{fontSize: '13px', color: '#666'}}>{customer.email || 'N/A'}</td>
                          <td style={{fontSize: '13px', color: '#666'}}>{customer.phone || 'N/A'}</td>
                          <td style={{verticalAlign: 'middle'}}>
                            <span className="amount" style={{
                              fontWeight: 'bold',
                              fontSize: '15px',
                              color: isDebit ? '#d32f2f' : '#2e7d32',
                              marginRight: '10px'
                            }}>
                              {isDebit ? '+' : '-'}{Math.abs(balance).toFixed(2)}
                            </span>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '600',
                              backgroundColor: isDebit ? '#ffebee' : '#e8f5e9',
                              color: isDebit ? '#c62828' : '#2e7d32',
                              whiteSpace: 'nowrap',
                              display: 'inline-block'
                            }}>
                              {isDebit ? 'Customer Owes' : 'Refund Due'}
                            </span>
                          </td>
                          <td>
                            <a 
                              href={`/customers/${customer.id}/debit-credit`} 
                              style={{
                                color: '#1976d2', 
                                textDecoration: 'none',
                                fontWeight: '500',
                                fontSize: '14px'
                              }}
                            >
                              View Details →
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>

          {/* Vendor Dues Section */}
          <div className="dues-section">
            <h4>Vendor Dues (Purchase Orders)</h4>
            {unPaidPOs.length === 0 ? (
              <p className="no-data">No outstanding vendor dues</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Vendor</th>
                    <th>Total Amount</th>
                    <th>Paid</th>
                    <th>Pending</th>
                    <th>Expected Delivery</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {unPaidPOs.map(po => {
                    const paidAmount = payments
                      .filter(p => p.po_id === po.id && p.status === 'completed')
                      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                    const pendingAmount = parseFloat(po.total_amount) - paidAmount;
                    const vendor = vendors.find(v => v.id === po.vendor_id);
                    
                    return (
                      <tr key={`po-${po.id}`}>
                        <td><strong>{po.po_number}</strong></td>
                        <td>{vendor?.name || 'N/A'}</td>
                        <td className="amount">{parseFloat(po.total_amount).toFixed(2)}</td>
                        <td className="amount paid">{paidAmount.toFixed(2)}</td>
                        <td className="amount pending">{pendingAmount.toFixed(2)}</td>
                        <td>{po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <span className="status-badge" style={{backgroundColor: getStatusBadge(po.status).bg}}>
                            {po.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Vendor Debit/Credit Notes Balance */}
          <div className="dues-section">
            <h4>Vendor Debit/Credit Note Balances</h4>
            {vendors.filter(v => v.debit_credit_balance && parseFloat(v.debit_credit_balance) !== 0).length === 0 ? (
              <p className="no-data">No vendor debit/credit note balances</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Vendor Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Balance Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors
                    .filter(v => v.debit_credit_balance && parseFloat(v.debit_credit_balance) !== 0)
                    .map(vendor => {
                      const balance = parseFloat(vendor.debit_credit_balance);
                      const isCredit = balance > 0;
                      return (
                        <tr key={`vendor-balance-${vendor.id}`}>
                          <td><strong>{vendor.name}</strong></td>
                          <td style={{fontSize: '13px', color: '#666'}}>{vendor.email || 'N/A'}</td>
                          <td style={{fontSize: '13px', color: '#666'}}>{vendor.phone || 'N/A'}</td>
                          <td style={{verticalAlign: 'middle'}}>
                            <span className="amount" style={{
                              fontWeight: 'bold',
                              fontSize: '15px',
                              color: isCredit ? '#d32f2f' : '#2e7d32',
                              marginRight: '10px'
                            }}>
                              {isCredit ? '+' : '-'}{Math.abs(balance).toFixed(2)}
                            </span>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '600',
                              backgroundColor: isCredit ? '#ffebee' : '#e8f5e9',
                              color: isCredit ? '#c62828' : '#2e7d32',
                              whiteSpace: 'nowrap',
                              display: 'inline-block'
                            }}>
                              {isCredit ? 'We Owe Vendor' : 'Deduction Applied'}
                            </span>
                          </td>
                          <td>
                            <a 
                              href={`/vendors/${vendor.id}/debit-credit`} 
                              style={{
                                color: '#1976d2', 
                                textDecoration: 'none',
                                fontWeight: '500',
                                fontSize: '14px'
                              }}
                            >
                              View Details →
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Overdue Dues Tab */}
      {activeTab === 'overdue' && (
        <div className="overdue-table">
          <h3>Overdue Dues (7+ days)</h3>
          {overdueDues.length === 0 ? (
            <p className="no-data">No overdue dues</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Entity</th>
                  <th>Type</th>
                  <th>Invoice Count</th>
                  <th>Total Overdue</th>
                  <th>Oldest Due Date</th>
                  <th>Days Overdue</th>
                </tr>
              </thead>
              <tbody>
                {overdueDues.map((due, idx) => {
                  const daysOverdue = due.oldest_due_date 
                    ? Math.floor((new Date() - new Date(due.oldest_due_date)) / (1000 * 60 * 60 * 24))
                    : 0;
                  
                  return (
                    <tr key={idx} className="overdue-row">
                      <td><strong>{due.entity_name}</strong></td>
                      <td>{due.type}</td>
                      <td>{due.invoice_count}</td>
                      <td className="amount danger">{parseFloat(due.total_due).toFixed(2)}</td>
                      <td>{new Date(due.oldest_due_date).toLocaleDateString()}</td>
                      <td className="days-overdue"><strong>{daysOverdue} days</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default Payments;
