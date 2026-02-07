import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { debitCreditAPI, customerAPI, productAPI } from '../services/api';
import { useToaster } from '../context/ToasterContext';
import '../styles/DebitCredit.css';

// Reason options for Debit Notes (increases what customer owes us)
const DEBIT_REASON_OPTIONS = [
  { value: '', label: '-- Select Reason --' },
  { value: 'Late Payment Charge', label: 'Late Payment Charge' },
  { value: 'Service Charge', label: 'Service Charge' },
  { value: 'Interest', label: 'Interest' },
  { value: 'Price Adjustment', label: 'Price Adjustment (Increase)' },
  { value: 'Additional Charges', label: 'Additional Charges' },
  { value: 'Freight Charges', label: 'Freight Charges' },
  { value: 'Packing Charges', label: 'Packing Charges' },
  { value: 'Other', label: 'Other' },
];

// Reason options for Credit Notes (decreases what customer owes us)
const CREDIT_REASON_OPTIONS = [
  { value: '', label: '-- Select Reason --' },
  { value: 'Return', label: 'Return (Goods Returned)' },
  { value: 'Damaged Goods', label: 'Damaged Goods' },
  { value: 'Defective Product', label: 'Defective Product' },
  { value: 'Overcharge', label: 'Overcharge Correction' },
  { value: 'Discount', label: 'Discount / Rebate' },
  { value: 'Price Adjustment', label: 'Price Adjustment (Decrease)' },
  { value: 'Quality Issue', label: 'Quality Issue' },
  { value: 'Short Shipment', label: 'Short Shipment' },
  { value: 'Other', label: 'Other' },
];

const CustomerDebitCredit = () => {
  const { customerId } = useParams();
  const { showToast } = useToaster();

  const [customer, setCustomer] = useState(null);
  const [balance, setBalance] = useState(null);
  const [debitNotes, setDebitNotes] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedCreditInvoice, setSelectedCreditInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('balance');
  const [showDebitForm, setShowDebitForm] = useState(false);
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [showBalanceForm, setShowBalanceForm] = useState(false);
  const [expandedDebitNote, setExpandedDebitNote] = useState(null);
  const [expandedCreditNote, setExpandedCreditNote] = useState(null);
  const [debitNoteItems, setDebitNoteItems] = useState({});
  const [creditNoteItems, setCreditNoteItems] = useState({});
  const [editingCreditNote, setEditingCreditNote] = useState(null);
  const [debitItemsToAdd, setDebitItemsToAdd] = useState([]);
  const [creditItemsToAdd, setCreditItemsToAdd] = useState([]);

  const [debitFormData, setDebitFormData] = useState({
    reason: '',
    amount: '',
    description: '',
    billing_id: '',
  });

  const [creditFormData, setCreditFormData] = useState({
    reason: '',
    amount: '',
    description: '',
    billing_id: '',
  });

  const [balanceFormData, setBalanceFormData] = useState({
    opening_balance: '',
  });

  // Load data
  useEffect(() => {
    loadData();
  }, [customerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customerData, overviewData, invoicesData, customerProductsData] = await Promise.all([
        customerAPI.getById(customerId),
        debitCreditAPI.getCustomerOverview(customerId),
        debitCreditAPI.getCustomerInvoices(customerId),
        debitCreditAPI.getCustomerProducts(customerId),
      ]);

      setCustomer(customerData);
      setBalance(overviewData.balance);
      setDebitNotes(overviewData.debitNotes);
      setCreditNotes(overviewData.creditNotes);
      setInvoices(invoicesData);
      setProducts(customerProductsData);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to safely format currency
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '0.00';
    const num = parseFloat(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  // Handle invoice selection for debit note
  const handleDebitInvoiceChange = async (invoiceId) => {
    if (!invoiceId) {
      setSelectedInvoice(null);
      setDebitFormData({ ...debitFormData, billing_id: '' });
      setDebitItemsToAdd([]);
      return;
    }

    try {
      const invoiceData = await debitCreditAPI.getInvoiceDetails(invoiceId);
      setSelectedInvoice(invoiceData);
      setDebitFormData({ ...debitFormData, billing_id: invoiceId });
      setDebitItemsToAdd([]);
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // Handle invoice selection for credit note
  const handleCreditInvoiceChange = async (invoiceId) => {
    if (!invoiceId) {
      setSelectedCreditInvoice(null);
      setCreditFormData({ ...creditFormData, billing_id: '' });
      setCreditItemsToAdd([]);
      return;
    }

    try {
      const invoiceData = await debitCreditAPI.getInvoiceDetails(invoiceId);
      setSelectedCreditInvoice(invoiceData);
      setCreditFormData({ ...creditFormData, billing_id: invoiceId });
      setCreditItemsToAdd([]);
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleCreateDebitNote = async (e) => {
    e.preventDefault();
    try {
      if (!debitFormData.reason || !debitFormData.amount) {
        showToast('Reason and amount are required', 'error');
        return;
      }

      await debitCreditAPI.createCustomerDebitNote({
        customer_id: parseInt(customerId),
        reason: debitFormData.reason,
        amount: parseFloat(debitFormData.amount),
        description: debitFormData.description,
        billing_id: debitFormData.billing_id ? parseInt(debitFormData.billing_id) : null,
        created_by: 'admin',
        items: debitItemsToAdd,
      });

      showToast('Debit note created successfully', 'success');
      setDebitFormData({ reason: '', amount: '', description: '', billing_id: '' });
      setDebitItemsToAdd([]);
      setShowDebitForm(false);
      loadData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleCreateCreditNote = async (e) => {
    e.preventDefault();
    try {
      if (!creditFormData.reason || !creditFormData.amount) {
        showToast('Reason and amount are required', 'error');
        return;
      }

      // Ensure items have proper numeric values for inventory update
      const formattedItems = creditItemsToAdd.map(item => ({
        product_id: parseInt(item.product_id) || null,
        product_name: item.product_name,
        quantity: parseInt(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        amount: parseFloat(item.amount) || 0,
      }));

      await debitCreditAPI.createCustomerCreditNote({
        customer_id: parseInt(customerId),
        reason: creditFormData.reason,
        amount: parseFloat(creditFormData.amount),
        description: creditFormData.description,
        billing_id: creditFormData.billing_id ? parseInt(creditFormData.billing_id) : null,
        created_by: 'admin',
        items: formattedItems,
      });

      showToast('Credit note created successfully', 'success');
      setCreditFormData({ reason: '', amount: '', description: '', billing_id: '' });
      setCreditItemsToAdd([]);
      setShowCreditForm(false);
      loadData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleUpdateBalance = async (e) => {
    e.preventDefault();
    try {
      if (!balanceFormData.opening_balance) {
        showToast('Opening balance is required', 'error');
        return;
      }

      await debitCreditAPI.updateCustomerBalance(customerId, {
        opening_balance: parseFloat(balanceFormData.opening_balance),
      });

      showToast('Balance updated successfully', 'success');
      setShowBalanceForm(false);
      loadData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleApproveDebitNote = async (debitNoteId) => {
    try {
      await debitCreditAPI.approveCustomerDebitNote(debitNoteId);
      showToast('Debit note approved', 'success');
      loadData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleCancelDebitNote = async (debitNoteId) => {
    try {
      await debitCreditAPI.cancelCustomerDebitNote(debitNoteId);
      showToast('Debit note cancelled', 'success');
      loadData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleApproveCreditNote = async (creditNoteId) => {
    try {
      await debitCreditAPI.approveCustomerCreditNote(creditNoteId);
      showToast('Credit note approved', 'success');
      loadData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleCancelCreditNote = async (creditNoteId) => {
    try {
      await debitCreditAPI.cancelCustomerCreditNote(creditNoteId);
      showToast('Credit note cancelled', 'success');
      loadData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // Load debit note items
  const loadDebitNoteItems = async (noteId) => {
    try {
      if (expandedDebitNote === noteId && debitNoteItems[noteId]) {
        setExpandedDebitNote(null);
        return;
      }
      const items = await debitCreditAPI.getCustomerDebitNoteItems(noteId);
      setDebitNoteItems({ ...debitNoteItems, [noteId]: items });
      setExpandedDebitNote(noteId);
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // Load credit note items
  const loadCreditNoteItems = async (noteId) => {
    try {
      if (expandedCreditNote === noteId && creditNoteItems[noteId]) {
        setExpandedCreditNote(null);
        return;
      }
      const items = await debitCreditAPI.getCustomerCreditNoteItems(noteId);
      setCreditNoteItems({ ...creditNoteItems, [noteId]: items });
      setExpandedCreditNote(noteId);
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // Handle credit note edit
  const handleEditCreditNote = (note) => {
    setEditingCreditNote({
      ...note,
      items: creditNoteItems[note.id] || [],
    });
  };

  // Handle save credit note
  const handleSaveCreditNote = async () => {
    try {
      if (!editingCreditNote.reason || !editingCreditNote.amount) {
        showToast('Reason and amount are required', 'error');
        return;
      }

      await debitCreditAPI.updateCustomerCreditNote(editingCreditNote.id, {
        reason: editingCreditNote.reason,
        amount: parseFloat(editingCreditNote.amount),
        description: editingCreditNote.description,
        items: editingCreditNote.items,
      });

      showToast('Credit note updated successfully', 'success');
      setEditingCreditNote(null);
      loadData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // Add item to debit note form
  const addDebitItem = (productId) => {
    if (!selectedInvoice || !selectedInvoice.items) {
      showToast('Please select an invoice first', 'error');
      return;
    }

    const invoiceItem = selectedInvoice.items.find(item => item.product_id === parseInt(productId));
    if (!invoiceItem) {
      showToast('Product not found in selected invoice', 'error');
      return;
    }

    const price = parseFloat(invoiceItem.price) || 0;
    const newItem = {
      product_id: parseInt(productId),
      product_name: invoiceItem.product_name,
      quantity: 1,
      unit_price: price,
      amount: price,
    };

    setDebitItemsToAdd([...debitItemsToAdd, newItem]);
  };

  // Remove item from debit note form
  const removeDebitItem = (index) => {
    setDebitItemsToAdd(debitItemsToAdd.filter((_, i) => i !== index));
  };

  // Update debit item
  const updateDebitItem = (index, field, value) => {
    const updatedItems = [...debitItemsToAdd];
    updatedItems[index][field] = value;
    if (field === 'quantity' || field === 'unit_price') {
      updatedItems[index].amount = (parseFloat(updatedItems[index].quantity) || 0) * (parseFloat(updatedItems[index].unit_price) || 0);
    }
    setDebitItemsToAdd(updatedItems);
  };

  // Add item to credit note form
  const addCreditItem = (productId) => {
    if (!selectedCreditInvoice || !selectedCreditInvoice.items) {
      showToast('Please select an invoice first', 'error');
      return;
    }

    const invoiceItem = selectedCreditInvoice.items.find(item => item.product_id === parseInt(productId));
    if (!invoiceItem) {
      showToast('Product not found in selected invoice', 'error');
      return;
    }

    const price = parseFloat(invoiceItem.price) || 0;
    const newItem = {
      product_id: parseInt(productId),
      product_name: invoiceItem.product_name,
      quantity: 1,
      unit_price: price,
      amount: price,
    };

    setCreditItemsToAdd([...creditItemsToAdd, newItem]);
  };

  // Remove item from credit note form
  const removeCreditItem = (index) => {
    setCreditItemsToAdd(creditItemsToAdd.filter((_, i) => i !== index));
  };

  // Update credit item
  const updateCreditItem = (index, field, value) => {
    const updatedItems = [...creditItemsToAdd];
    updatedItems[index][field] = value;
    if (field === 'quantity' || field === 'unit_price') {
      updatedItems[index].amount = (parseFloat(updatedItems[index].quantity) || 0) * (parseFloat(updatedItems[index].unit_price) || 0);
    }
    setCreditItemsToAdd(updatedItems);
  };

  if (loading) {
    return <div className="debit-credit-container">Loading...</div>;
  }

  return (
    <div className="debit-credit-container">
      {/* Header */}
      <div className="debit-credit-header">
        <h1>Customer Debit/Credit Management</h1>
        {customer && (
          <div className="customer-info">
            <p><strong>{customer.name}</strong></p>
            <p>{customer.email}</p>
          </div>
        )}
      </div>

      {/* Balance Summary */}
      {balance && (
        <div className="balance-summary">
          <div className="balance-card">
            <h3>Opening Balance</h3>
            <p className="balance-amount">{formatCurrency(balance.opening_balance)}</p>
          </div>
          <div className="balance-card">
            <h4>Customer Owes</h4>
            <p className={`balance-amount ${parseFloat(balance.current_balance) >= 0 ? 'debit' : 'credit'}`}>
              ₹{formatCurrency(Math.abs(balance.current_balance))}
            </p>
            <small className="balance-hint">
              {parseFloat(balance.current_balance) >= 0 
                ? 'Customer owes you' 
                : 'You owe customer (credit balance)'}
            </small>
          </div>
          <div className="balance-card">
            <h4>Total Debits</h4>
            <p className="balance-amount debit">₹{formatCurrency(balance.total_debit)}</p>
            <small className="balance-hint">Increased customer's payable</small>
          </div>
          <div className="balance-card">
            <h4>Total Credits</h4>
            <p className="balance-amount credit">₹{formatCurrency(balance.total_credit)}</p>
            <small className="balance-hint">Reduced customer's payable</small>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => setShowBalanceForm(!showBalanceForm)}
          >
            {showBalanceForm ? 'Cancel' : 'Update Balance'}
          </button>
        </div>
      )}

      {/* Update Balance Form */}
      {showBalanceForm && (
        <div className="form-section">
          <h3>Update Opening Balance</h3>
          <form onSubmit={handleUpdateBalance}>
            <input
              type="number"
              step="0.01"
              placeholder="Opening Balance"
              value={balanceFormData.opening_balance}
              onChange={(e) => setBalanceFormData({ ...balanceFormData, opening_balance: e.target.value })}
              required
            />
            <button type="submit" className="btn btn-primary">Update Balance</button>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'balance' ? 'active' : ''}`}
          onClick={() => setActiveTab('balance')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'debits' ? 'active' : ''}`}
          onClick={() => setActiveTab('debits')}
        >
          Debit Notes ({debitNotes.length})
        </button>
        <button
          className={`tab ${activeTab === 'credits' ? 'active' : ''}`}
          onClick={() => setActiveTab('credits')}
        >
          Credit Notes ({creditNotes.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'balance' && (
        <div className="tab-content">
          <div className="logic-explanation">
            <h3>📊 Debit/Credit Note Logic for Customers</h3>
            <div className="explanation-grid">
              <div className="explanation-card debit-explanation">
                <h4>✅ Debit Note (to Customer)</h4>
                <p><strong>Meaning:</strong> Increase what customer owes you</p>
                <p><strong>Use when:</strong></p>
                <ul>
                  <li>Additional charges (packing, freight, late fee)</li>
                  <li>Price increased after invoice</li>
                  <li>Extra quantity delivered</li>
                </ul>
                <p><strong>Impact:</strong> Customer balance ↑ (they pay more)</p>
              </div>
              <div className="explanation-card credit-explanation">
                <h4>✅ Credit Note (to Customer)</h4>
                <p><strong>Meaning:</strong> Reduce what customer owes you</p>
                <p><strong>Use when:</strong></p>
                <ul>
                  <li>Sales return / goods returned</li>
                  <li>Overcharged in invoice</li>
                  <li>Discount given after invoice</li>
                  <li>Damaged goods accepted back</li>
                </ul>
                <p><strong>Impact:</strong> Customer balance ↓ (they pay less)</p>
              </div>
            </div>
          </div>
          <div className="summary-grid">
            {balance && (
              <>
                <div className="summary-item">
                  <label>Opening Balance</label>
                  <span>₹{formatCurrency(balance.opening_balance)}</span>
                </div>
                <div className="summary-item">
                  <label>Total Debits</label>
                  <span className="debit">+₹{formatCurrency(balance.total_debit)}</span>
                </div>
                <div className="summary-item">
                  <label>Total Credits</label>
                  <span className="credit">-₹{formatCurrency(balance.total_credit)}</span>
                </div>
                <div className="summary-item">
                  <label>Net Balance (Customer Owes)</label>
                  <span className={parseFloat(balance.current_balance) >= 0 ? 'balance-positive' : 'balance-negative'}>
                    ₹{formatCurrency(balance.current_balance)}
                    {parseFloat(balance.current_balance) < 0 && ' (Credit)'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Debit Notes Tab */}
      {activeTab === 'debits' && (
        <div className="tab-content">
          <button
            className="btn btn-primary"
            onClick={() => setShowDebitForm(!showDebitForm)}
          >
            {showDebitForm ? 'Cancel' : '+ Create Debit Note'}
          </button>

          {showDebitForm && (
            <form onSubmit={handleCreateDebitNote} className="note-form">
              <div className="form-group">
                <label>Select Invoice * (Required)</label>
                <select
                  value={debitFormData.billing_id}
                  onChange={(e) => handleDebitInvoiceChange(e.target.value)}
                  required
                >
                  <option value="">-- Select an invoice --</option>
                  {invoices.map(invoice => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - ₹{formatCurrency(invoice.total_amount)} 
                      (Due: ₹{formatCurrency(invoice.due_amount)}) - {new Date(invoice.invoice_date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              {selectedInvoice && (
                <div className="invoice-details-box">
                  <h4>📄 Selected Invoice Details</h4>
                  <div className="invoice-info-grid">
                    <div>
                      <strong>Invoice #:</strong> {selectedInvoice.invoice.invoice_number}
                    </div>
                    <div>
                      <strong>Date:</strong> {new Date(selectedInvoice.invoice.invoice_date).toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Total Amount:</strong> ₹{formatCurrency(selectedInvoice.invoice.total_amount)}
                    </div>
                    <div>
                      <strong>Due Amount:</strong> ₹{formatCurrency(selectedInvoice.invoice.due_amount)}
                    </div>
                  </div>
                  {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                    <div className="invoice-items">
                      <strong>Invoice Items:</strong>
                      <table className="mini-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedInvoice.items.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.product_name}</td>
                              <td>{item.quantity}</td>
                              <td>₹{formatCurrency(item.price)}</td>
                              <td>₹{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Reason *</label>
                <select
                  value={debitFormData.reason}
                  onChange={(e) => setDebitFormData({ ...debitFormData, reason: e.target.value })}
                  required
                >
                  {DEBIT_REASON_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={debitFormData.amount}
                  onChange={(e) => setDebitFormData({ ...debitFormData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  placeholder="Additional details about this debit note..."
                  value={debitFormData.description}
                  onChange={(e) => setDebitFormData({ ...debitFormData, description: e.target.value })}
                />
              </div>

              {/* Product Items Section */}
              <div className="form-section">
                <h3>Add Products (Optional)</h3>
                <div className="form-group">
                  <label>Select Product</label>
                  <select onChange={(e) => e.target.value && addDebitItem(e.target.value)} defaultValue="" disabled={!selectedInvoice}>
                    <option value="">{selectedInvoice ? 'Choose a product...' : 'Select an invoice first'}</option>
                    {selectedInvoice && selectedInvoice.items && selectedInvoice.items.map((item, idx) => (
                      <option key={idx} value={item.product_id}>
                        {item.product_name} (SKU: {item.sku || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>

                {debitItemsToAdd.length > 0 && (
                  <div className="items-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Quantity</th>
                          <th>Unit Price</th>
                          <th>Amount</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {debitItemsToAdd.map((item, index) => (
                          <tr key={index}>
                            <td>{item.product_name}</td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateDebitItem(index, 'quantity', e.target.value)}
                                style={{ width: '80px' }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => updateDebitItem(index, 'unit_price', e.target.value)}
                                style={{ width: '100px' }}
                              />
                            </td>
                            <td>{formatCurrency(item.amount)}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => removeDebitItem(index)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary">Create Debit Note</button>
            </form>
          )}

          <div className="notes-list">
            {debitNotes.length === 0 ? (
              <p className="empty-state">No debit notes yet</p>
            ) : (
              debitNotes.map((note) => (
                <div key={note.id} className={`note-item ${note.status}`}>
                  <div className="note-header">
                    <h4>{note.debit_note_number}</h4>
                    <span className={`status-badge ${note.status}`}>{note.status}</span>
                  </div>
                  <div className="note-details">
                    <p><strong>Reason:</strong> {note.reason}</p>
                    <p><strong>Amount:</strong> {formatCurrency(note.amount)}</p>
                    <p><strong>Description:</strong> {note.description}</p>
                    <p><strong>Date:</strong> {new Date(note.note_date).toLocaleDateString()}</p>
                    {note.invoice_number && <p><strong>Invoice:</strong> {note.invoice_number}</p>}
                    {note.sale_id && <p><strong>Sale ID:</strong> {note.sale_id}</p>}
                    {note.billing_amount && <p><strong>Billing Amount:</strong> {formatCurrency(note.billing_amount)}</p>}
                  </div>
                  
                  {/* Expandable Product Details */}
                  <div className="note-section">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => loadDebitNoteItems(note.id)}
                    >
                      {expandedDebitNote === note.id ? '▼ Hide' : '▶ Show'} Product Details
                    </button>
                    {expandedDebitNote === note.id && debitNoteItems[note.id] && (
                      <div className="note-items-table">
                        {debitNoteItems[note.id].length === 0 ? (
                          <p className="empty-state">No items in this note</p>
                        ) : (
                          <table>
                            <thead>
                              <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {debitNoteItems[note.id].map((item) => (
                                <tr key={item.id}>
                                  <td>{item.product_name || 'N/A'}</td>
                                  <td>{item.sku || 'N/A'}</td>
                                  <td>{item.quantity}</td>
                                  <td>{formatCurrency(item.unit_price)}</td>
                                  <td>{formatCurrency(item.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="note-actions">
                    {note.status === 'pending' && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleApproveDebitNote(note.id)}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleCancelDebitNote(note.id)}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {note.status === 'approved' && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleCancelDebitNote(note.id)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Credit Notes Tab */}
      {activeTab === 'credits' && (
        <div className="tab-content">
          <button
            className="btn btn-primary"
            onClick={() => setShowCreditForm(!showCreditForm)}
          >
            {showCreditForm ? 'Cancel' : '+ Create Credit Note'}
          </button>

          {showCreditForm && (
            <form onSubmit={handleCreateCreditNote} className="note-form">
              <div className="form-group">
                <label>Select Invoice * (Required)</label>
                <select
                  value={creditFormData.billing_id}
                  onChange={(e) => handleCreditInvoiceChange(e.target.value)}
                  required
                >
                  <option value="">-- Select an invoice --</option>
                  {invoices.map(invoice => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - ₹{formatCurrency(invoice.total_amount)} 
                      (Due: ₹{formatCurrency(invoice.due_amount)}) - {new Date(invoice.invoice_date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCreditInvoice && (
                <div className="invoice-details-box">
                  <h4>📄 Selected Invoice Details</h4>
                  <div className="invoice-info-grid">
                    <div>
                      <strong>Invoice #:</strong> {selectedCreditInvoice.invoice.invoice_number}
                    </div>
                    <div>
                      <strong>Date:</strong> {new Date(selectedCreditInvoice.invoice.invoice_date).toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Total Amount:</strong> ₹{formatCurrency(selectedCreditInvoice.invoice.total_amount)}
                    </div>
                    <div>
                      <strong>Due Amount:</strong> ₹{formatCurrency(selectedCreditInvoice.invoice.due_amount)}
                    </div>
                  </div>
                  {selectedCreditInvoice.items && selectedCreditInvoice.items.length > 0 && (
                    <div className="invoice-items">
                      <strong>Invoice Items:</strong>
                      <table className="mini-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCreditInvoice.items.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.product_name}</td>
                              <td>{item.quantity}</td>
                              <td>₹{formatCurrency(item.price)}</td>
                              <td>₹{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Reason *</label>
                <select
                  value={creditFormData.reason}
                  onChange={(e) => setCreditFormData({ ...creditFormData, reason: e.target.value })}
                  required
                >
                  {CREDIT_REASON_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {['Return', 'Damaged Goods', 'Defective Product', 'Quality Issue'].includes(creditFormData.reason) && creditItemsToAdd.length > 0 && (
                  <small className="info-text" style={{ color: '#28a745', display: 'block', marginTop: '5px' }}>
                    ✓ Inventory will be updated: Product quantities will be added back to stock
                  </small>
                )}
                {['Return', 'Damaged Goods', 'Defective Product', 'Quality Issue'].includes(creditFormData.reason) && creditItemsToAdd.length === 0 && (
                  <small className="info-text" style={{ color: '#dc3545', display: 'block', marginTop: '5px' }}>
                    ⚠ To update inventory, you must add products below. Without products, only the credit amount will be recorded.
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={creditFormData.amount}
                  onChange={(e) => setCreditFormData({ ...creditFormData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  placeholder="Additional details about this credit note..."
                  value={creditFormData.description}
                  onChange={(e) => setCreditFormData({ ...creditFormData, description: e.target.value })}
                />
              </div>

              {/* Product Items Section */}
              <div className="form-section">
                <h3>
                  Add Products {['Return', 'Damaged Goods', 'Defective Product', 'Quality Issue'].includes(creditFormData.reason) ? <span style={{ color: '#dc3545' }}>* (Required for Inventory Update)</span> : '(Optional)'}
                </h3>
                <div className="form-group">
                  <label>Select Product</label>
                  <select onChange={(e) => e.target.value && addCreditItem(e.target.value)} defaultValue="" disabled={!selectedCreditInvoice}>
                    <option value="">{selectedCreditInvoice ? 'Choose a product...' : 'Select an invoice first'}</option>
                    {selectedCreditInvoice && selectedCreditInvoice.items && selectedCreditInvoice.items.map((item, idx) => (
                      <option key={idx} value={item.product_id}>
                        {item.product_name} (SKU: {item.sku || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>

                {creditItemsToAdd.length > 0 && (
                  <div className="items-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Quantity</th>
                          <th>Unit Price</th>
                          <th>Amount</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creditItemsToAdd.map((item, index) => (
                          <tr key={index}>
                            <td>{item.product_name}</td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateCreditItem(index, 'quantity', e.target.value)}
                                style={{ width: '80px' }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => updateCreditItem(index, 'unit_price', e.target.value)}
                                style={{ width: '100px' }}
                              />
                            </td>
                            <td>{formatCurrency(item.amount)}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => removeCreditItem(index)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary">Create Credit Note</button>
            </form>
          )}

          <div className="notes-list">
            {creditNotes.length === 0 ? (
              <p className="empty-state">No credit notes yet</p>
            ) : (
              creditNotes.map((note) => (
                <div key={note.id} className={`note-item ${note.status}`}>
                  {editingCreditNote?.id === note.id ? (
                    <div className="note-edit-form">
                      <h4>Edit Credit Note</h4>
                      <div className="form-group">
                        <label>Reason *</label>
                        <select
                          value={editingCreditNote.reason}
                          onChange={(e) => setEditingCreditNote({ ...editingCreditNote, reason: e.target.value })}
                          required
                        >
                          {CREDIT_REASON_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {editingCreditNote.reason === 'Return' && editingCreditNote.items && editingCreditNote.items.length > 0 && (
                          <small className="info-text" style={{ color: '#28a745', display: 'block', marginTop: '5px' }}>
                            ✓ Inventory will be updated when saved
                          </small>
                        )}
                      </div>
                      <div className="form-group">
                        <label>Amount *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingCreditNote.amount}
                          onChange={(e) => setEditingCreditNote({ ...editingCreditNote, amount: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <textarea
                          value={editingCreditNote.description}
                          onChange={(e) => setEditingCreditNote({ ...editingCreditNote, description: e.target.value })}
                        />
                      </div>
                      <div className="edit-actions">
                        <button className="btn btn-success btn-sm" onClick={handleSaveCreditNote}>
                          Save
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEditingCreditNote(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="note-header">
                        <h4>{note.credit_note_number}</h4>
                        <span className={`status-badge ${note.status}`}>{note.status}</span>
                      </div>
                      <div className="note-details">
                        <p><strong>Reason:</strong> {note.reason}</p>
                        <p><strong>Amount:</strong> {formatCurrency(note.amount)}</p>
                        <p><strong>Description:</strong> {note.description}</p>
                        <p><strong>Date:</strong> {new Date(note.note_date).toLocaleDateString()}</p>
                        {note.invoice_number && <p><strong>Invoice:</strong> {note.invoice_number}</p>}
                        {note.sale_id && <p><strong>Sale ID:</strong> {note.sale_id}</p>}
                        {note.billing_amount && <p><strong>Billing Amount:</strong> {formatCurrency(note.billing_amount)}</p>}
                      </div>

                      {/* Expandable Product Details */}
                      <div className="note-section">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => loadCreditNoteItems(note.id)}
                        >
                          {expandedCreditNote === note.id ? '▼ Hide' : '▶ Show'} Product Details
                        </button>
                        {expandedCreditNote === note.id && creditNoteItems[note.id] && (
                          <div className="note-items-table">
                            {creditNoteItems[note.id].length === 0 ? (
                              <p className="empty-state">No items in this note</p>
                            ) : (
                              <table>
                                <thead>
                                  <tr>
                                    <th>Product</th>
                                    <th>SKU</th>
                                    <th>Quantity</th>
                                    <th>Unit Price</th>
                                    <th>Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {creditNoteItems[note.id].map((item) => (
                                    <tr key={item.id}>
                                      <td>{item.product_name || 'N/A'}</td>
                                      <td>{item.sku || 'N/A'}</td>
                                      <td>{item.quantity}</td>
                                      <td>{formatCurrency(item.unit_price)}</td>
                                      <td>{formatCurrency(item.amount)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="note-actions">
                        {note.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleEditCreditNote(note)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleApproveCreditNote(note.id)}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleCancelCreditNote(note.id)}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {note.status === 'approved' && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleCancelCreditNote(note.id)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDebitCredit;
