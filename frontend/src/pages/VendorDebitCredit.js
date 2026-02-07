import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { debitCreditAPI, productAPI, vendorAPI } from '../services/api';
import { useToaster } from '../context/ToasterContext';
import '../styles/DebitCredit.css';

// Reason options for Vendor Debit Notes (decreases what we owe vendor)
const VENDOR_DEBIT_REASON_OPTIONS = [
  { value: '', label: '-- Select Reason --' },
  { value: 'Return', label: 'Return (Goods Returned to Vendor)' },
  { value: 'Damaged Goods', label: 'Damaged Goods' },
  { value: 'Defective Product', label: 'Defective Product' },
  { value: 'Quality Issue', label: 'Quality Issue' },
  { value: 'Short Shipment', label: 'Short Shipment' },
  { value: 'Overcharge', label: 'Overcharge Correction' },
  { value: 'Discount', label: 'Discount / Rebate' },
  { value: 'Price Adjustment', label: 'Price Adjustment (Decrease)' },
  { value: 'Other', label: 'Other' },
];

// Reason options for Vendor Credit Notes (increases what we owe vendor)
const VENDOR_CREDIT_REASON_OPTIONS = [
  { value: '', label: '-- Select Reason --' },
  { value: 'Price Increase', label: 'Price Increase' },
  { value: 'Additional Charges', label: 'Additional Charges' },
  { value: 'Freight Charges', label: 'Freight Charges' },
  { value: 'Packing Charges', label: 'Packing Charges' },
  { value: 'Late Payment Interest', label: 'Late Payment Interest' },
  { value: 'Service Charge', label: 'Service Charge' },
  { value: 'Missed Charges', label: 'Missed Charges' },
  { value: 'Other', label: 'Other' },
];

const VendorDebitCredit = () => {
  const { vendorId } = useParams();
  const { showToast } = useToaster();

  const [vendor, setVendor] = useState(null);
  const [balance, setBalance] = useState(null);
  const [debitNotes, setDebitNotes] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedDebitPO, setSelectedDebitPO] = useState(null);
  const [selectedCreditPO, setSelectedCreditPO] = useState(null);
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
    po_id: '',
  });

  const [creditFormData, setCreditFormData] = useState({
    reason: '',
    amount: '',
    description: '',
    po_id: '',
  });

  const [balanceFormData, setBalanceFormData] = useState({
    opening_balance: '',
  });

  // Load data
  useEffect(() => {
    loadData();
  }, [vendorId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vendorData, balanceData, debitData, creditData, vendorProductsData, poData] = await Promise.all([
        vendorAPI.getById(vendorId),
        debitCreditAPI.getVendorBalance(vendorId).catch(() => null),
        debitCreditAPI.getVendorDebitNotes(vendorId),
        debitCreditAPI.getVendorCreditNotes(vendorId),
        debitCreditAPI.getVendorProducts(vendorId).catch(() => []),
        debitCreditAPI.getVendorPurchaseOrders(vendorId),
      ]);

      setVendor(vendorData);
      setBalance(balanceData);
      setDebitNotes(debitData);
      setCreditNotes(creditData);
      
      // If no vendor-specific products found, load all products as fallback
      if (!vendorProductsData || vendorProductsData.length === 0) {
        try {
          const allProducts = await productAPI.getAll();
          setProducts(allProducts);
        } catch (err) {
          setProducts([]);
          showToast('Could not load products', 'warning');
        }
      } else {
        setProducts(vendorProductsData);
      }
      
      setPurchaseOrders(poData);
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

  // Handle PO selection for debit note
  const handleDebitPOChange = async (poId) => {
    if (!poId) {
      setSelectedDebitPO(null);
      setDebitFormData({ ...debitFormData, po_id: '' });
      // Reset products to vendor products or all products
      loadData();
      return;
    }

    try {
      const poData = await debitCreditAPI.getPurchaseOrderDetails(poId);
      setSelectedDebitPO(poData);
      setDebitFormData({ ...debitFormData, po_id: poId });
      
      // Filter products to show only items from this PO
      if (poData.items && poData.items.length > 0) {
        const poProducts = poData.items.map((item, index) => ({
          id: item.product_id || `manual_${index}`, // Use index for manually entered items
          name: item.product_name,
          sku: item.sku || '',
          hsn_code: item.hsn_code || '',
          price: item.price || 0
        }));
        setProducts(poProducts);
      } else {
        setProducts([]);
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // Handle PO selection for credit note
  const handleCreditPOChange = async (poId) => {
    if (!poId) {
      setSelectedCreditPO(null);
      setCreditFormData({ ...creditFormData, po_id: '' });
      // Reset products to vendor products or all products
      loadData();
      return;
    }

    try {
      const poData = await debitCreditAPI.getPurchaseOrderDetails(poId);
      setSelectedCreditPO(poData);
      setCreditFormData({ ...creditFormData, po_id: poId });
      
      // Filter products to show only items from this PO
      if (poData.items && poData.items.length > 0) {
        const poProducts = poData.items.map((item, index) => ({
          id: item.product_id || `manual_${index}`, // Use index for manually entered items
          name: item.product_name,
          sku: item.sku || '',
          hsn_code: item.hsn_code || '',
          price: item.price || 0
        }));
        setProducts(poProducts);
      } else {
        setProducts([]);
      }
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

      // Ensure items have proper numeric values for inventory update
      const formattedItems = debitItemsToAdd.map(item => ({
        product_id: parseInt(item.product_id) || null,
        product_name: item.product_name,
        quantity: parseInt(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        amount: parseFloat(item.amount) || 0,
      }));

      await debitCreditAPI.createVendorDebitNote({
        vendor_id: parseInt(vendorId),
        reason: debitFormData.reason,
        amount: parseFloat(debitFormData.amount),
        description: debitFormData.description,
        po_id: debitFormData.po_id ? parseInt(debitFormData.po_id) : null,
        created_by: 'admin',
        items: formattedItems,
      });

      showToast('Debit note created successfully', 'success');
      setDebitFormData({ reason: '', amount: '', description: '', po_id: '' });
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

      await debitCreditAPI.createVendorCreditNote({
        vendor_id: parseInt(vendorId),
        reason: creditFormData.reason,
        amount: parseFloat(creditFormData.amount),
        description: creditFormData.description,
        po_id: creditFormData.po_id ? parseInt(creditFormData.po_id) : null,
        created_by: 'admin',
        items: creditItemsToAdd,
      });

      showToast('Credit note created successfully', 'success');
      setCreditFormData({ reason: '', amount: '', description: '', po_id: '' });
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

      await debitCreditAPI.updateVendorBalance(vendorId, {
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
      await debitCreditAPI.approveVendorDebitNote(debitNoteId);
      showToast('Debit note approved', 'success');
      loadData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleCancelDebitNote = async (debitNoteId) => {
    try {
      await debitCreditAPI.cancelVendorDebitNote(debitNoteId);
      showToast('Debit note cancelled', 'success');
      loadData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleApproveCreditNote = async (creditNoteId) => {
    try {
      await debitCreditAPI.approveVendorCreditNote(creditNoteId);
      showToast('Credit note approved', 'success');
      loadData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleCancelCreditNote = async (creditNoteId) => {
    try {
      await debitCreditAPI.cancelVendorCreditNote(creditNoteId);
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
      const items = await debitCreditAPI.getVendorDebitNoteItems(noteId);
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
      const items = await debitCreditAPI.getVendorCreditNoteItems(noteId);
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

      await debitCreditAPI.updateVendorCreditNote(editingCreditNote.id, {
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
    // Handle both numeric IDs and string IDs (like manual_0)
    const product = products.find(p => String(p.id) === String(productId));
    if (!product) {
      showToast('Product not found', 'error');
      return;
    }

    const price = parseFloat(product.price) || 0;
    const newItem = {
      product_id: String(productId).startsWith('manual_') ? null : parseInt(productId),
      product_name: product.name,
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
    // Convert to number for quantity and unit_price
    if (field === 'quantity') {
      updatedItems[index][field] = parseInt(value) || 0;
    } else if (field === 'unit_price') {
      updatedItems[index][field] = parseFloat(value) || 0;
    } else {
      updatedItems[index][field] = value;
    }
    // Recalculate amount
    updatedItems[index].amount = (parseInt(updatedItems[index].quantity) || 0) * (parseFloat(updatedItems[index].unit_price) || 0);
    setDebitItemsToAdd(updatedItems);
  };

  // Add item to credit note form
  const addCreditItem = (productId) => {
    // Handle both numeric IDs and string IDs (like manual_0)
    const product = products.find(p => String(p.id) === String(productId));
    if (!product) {
      showToast('Product not found', 'error');
      return;
    }

    const price = parseFloat(product.price) || 0;
    const newItem = {
      product_id: String(productId).startsWith('manual_') ? null : parseInt(productId),
      product_name: product.name,
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
        <h1>Vendor Debit/Credit Management</h1>
        {vendor && (
          <div className="customer-info">
            <p><strong>{vendor.name}</strong></p>
            <p>{vendor.email}</p>
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
            <h4>You Owe Vendor</h4>
            <p className={`balance-amount ${parseFloat(balance.current_balance) >= 0 ? 'credit' : 'debit'}`}>
              ₹{formatCurrency(Math.abs(balance.current_balance))}
            </p>
            <small className="balance-hint">
              {parseFloat(balance.current_balance) >= 0 
                ? 'You owe vendor' 
                : 'Vendor owes you (advance paid)'}
            </small>
          </div>
          <div className="balance-card">
            <h4>Total Debits</h4>
            <p className="balance-amount debit">₹{formatCurrency(balance.total_debit)}</p>
            <small className="balance-hint">Reduced your payable</small>
          </div>
          <div className="balance-card">
            <h4>Total Credits</h4>
            <p className="balance-amount credit">₹{formatCurrency(balance.total_credit)}</p>
            <small className="balance-hint">Increased your payable</small>
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
            <h3>📊 Debit/Credit Note Logic for Vendors</h3>
            <div className="explanation-grid">
              <div className="explanation-card debit-explanation">
                <h4>✅ Debit Note (to Vendor)</h4>
                <p><strong>Meaning:</strong> Reduce what you owe vendor</p>
                <p><strong>Use when:</strong></p>
                <ul>
                  <li>Purchase return / goods returned</li>
                  <li>Vendor overcharged</li>
                  <li>Damaged goods received</li>
                  <li>Post-invoice discount received</li>
                </ul>
                <p><strong>Impact:</strong> Vendor balance ↓ (you pay less)</p>
              </div>
              <div className="explanation-card credit-explanation">
                <h4>✅ Credit Note (from Vendor)</h4>
                <p><strong>Meaning:</strong> Increase what you owe vendor</p>
                <p><strong>Use when:</strong></p>
                <ul>
                  <li>Additional charges from vendor</li>
                  <li>Price revision upward</li>
                  <li>Missed charges earlier</li>
                </ul>
                <p><strong>Impact:</strong> Vendor balance ↑ (you pay more)</p>
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
                  <span className="debit">-₹{formatCurrency(balance.total_debit)}</span>
                </div>
                <div className="summary-item">
                  <label>Total Credits</label>
                  <span className="credit">+₹{formatCurrency(balance.total_credit)}</span>
                </div>
                <div className="summary-item">
                  <label>Net Balance (You Owe)</label>
                  <span className={parseFloat(balance.current_balance) >= 0 ? 'balance-positive' : 'balance-negative'}>
                    ₹{formatCurrency(balance.current_balance)}
                    {parseFloat(balance.current_balance) < 0 && ' (Advance)'}
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
                <label>Select Purchase Order *</label>
                <select
                  value={debitFormData.po_id}
                  onChange={(e) => handleDebitPOChange(e.target.value)}
                  required
                >
                  <option value="">Choose a purchase order...</option>
                  {purchaseOrders.map(po => (
                    <option key={po.id} value={po.id}>
                      {po.po_number} - ₹{formatCurrency(po.total_amount)} ({new Date(po.po_date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* PO Details Display */}
              {selectedDebitPO && (
                <div className="invoice-details-box">
                  <h4>Purchase Order Details</h4>
                  <div className="invoice-info">
                    <div className="info-row">
                      <span className="label">PO Number:</span>
                      <span className="value">{selectedDebitPO.po.po_number}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">PO Date:</span>
                      <span className="value">{new Date(selectedDebitPO.po.po_date).toLocaleDateString()}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Total Amount:</span>
                      <span className="value">₹{formatCurrency(selectedDebitPO.po.total_amount)}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Status:</span>
                      <span className="value">{selectedDebitPO.po.status}</span>
                    </div>
                  </div>
                  
                  {selectedDebitPO.items && selectedDebitPO.items.length > 0 && (
                    <div className="invoice-items">
                      <h5>Items:</h5>
                      <table>
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>HSN</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDebitPO.items.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.product_name}</td>
                              <td>{item.hsn_code || '-'}</td>
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
                  {VENDOR_DEBIT_REASON_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {['Return', 'Damaged Goods', 'Defective Product', 'Quality Issue'].includes(debitFormData.reason) && debitItemsToAdd.length > 0 && (
                  <small className="info-text" style={{ color: '#dc3545', display: 'block', marginTop: '5px' }}>
                    ⚠ Inventory will be decreased: Product quantities will be removed from stock
                  </small>
                )}
                {['Return', 'Damaged Goods', 'Defective Product', 'Quality Issue'].includes(debitFormData.reason) && debitItemsToAdd.length === 0 && (
                  <small className="info-text" style={{ color: '#ffc107', display: 'block', marginTop: '5px' }}>
                    ℹ To update inventory, add products below. Without products, only the debit amount will be recorded.
                  </small>
                )}
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
                  placeholder="Additional details..."
                  value={debitFormData.description}
                  onChange={(e) => setDebitFormData({ ...debitFormData, description: e.target.value })}
                />
              </div>

              {/* Product Items Section */}
              <div className="form-section">
                <h3>
                  Add Products {['Return', 'Damaged Goods', 'Defective Product', 'Quality Issue'].includes(debitFormData.reason) ? <span style={{ color: '#dc3545' }}>* (Required for Inventory Update)</span> : '(Optional)'}
                </h3>
                <div className="form-group">
                  <label>Select Product</label>
                  <select onChange={(e) => e.target.value && addDebitItem(e.target.value)} defaultValue="">
                    <option value="">Choose a product...</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} (SKU: {product.sku})
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
                <label>Select Purchase Order *</label>
                <select
                  value={creditFormData.po_id}
                  onChange={(e) => handleCreditPOChange(e.target.value)}
                  required
                >
                  <option value="">Choose a purchase order...</option>
                  {purchaseOrders.map(po => (
                    <option key={po.id} value={po.id}>
                      {po.po_number} - ₹{formatCurrency(po.total_amount)} ({new Date(po.po_date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* PO Details Display */}
              {selectedCreditPO && (
                <div className="invoice-details-box">
                  <h4>Purchase Order Details</h4>
                  <div className="invoice-info">
                    <div className="info-row">
                      <span className="label">PO Number:</span>
                      <span className="value">{selectedCreditPO.po.po_number}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">PO Date:</span>
                      <span className="value">{new Date(selectedCreditPO.po.po_date).toLocaleDateString()}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Total Amount:</span>
                      <span className="value">₹{formatCurrency(selectedCreditPO.po.total_amount)}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Status:</span>
                      <span className="value">{selectedCreditPO.po.status}</span>
                    </div>
                  </div>
                  
                  {selectedCreditPO.items && selectedCreditPO.items.length > 0 && (
                    <div className="invoice-items">
                      <h5>Items:</h5>
                      <table>
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>HSN</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCreditPO.items.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.product_name}</td>
                              <td>{item.hsn_code || '-'}</td>
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
                  {VENDOR_CREDIT_REASON_OPTIONS.map(option => (
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
                  value={creditFormData.amount}
                  onChange={(e) => setCreditFormData({ ...creditFormData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  placeholder="Additional details..."
                  value={creditFormData.description}
                  onChange={(e) => setCreditFormData({ ...creditFormData, description: e.target.value })}
                />
              </div>

              {/* Product Items Section */}
              <div className="form-section">
                <h3>Add Products (Optional)</h3>
                <div className="form-group">
                  <label>Select Product</label>
                  <select onChange={(e) => e.target.value && addCreditItem(e.target.value)} defaultValue="">
                    <option value="">Choose a product...</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} (SKU: {product.sku})
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
                          {VENDOR_CREDIT_REASON_OPTIONS.map(option => (
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

export default VendorDebitCredit;
