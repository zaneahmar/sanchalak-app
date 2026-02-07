import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import '../styles/Sales.css';

const Sales = () => {
  const { sales, inventory, customers, addSale, updateSale, deleteSale } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [gstPercentage, setGstPercentage] = useState('18');
  const [notes, setNotes] = useState('');
  const [productSelect, setProductSelect] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [filters, setFilters] = useState({
    searchCustomer: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: '',
  });

  const handleAddItem = (productId) => {
    if (!productId) return;
    const product = inventory.find(p => String(p.id) === String(productId));
    if (product && (product.stock_quantity || product.stock || 0) > 0) {
      setSelectedItems([
        ...selectedItems,
        {
          productId,
          name: product.name,
          price: parseFloat(product.price),
          quantity: 1,
          stock: product.stock_quantity || product.stock || 0,
        },
      ]);
      setProductSelect(''); // Reset select
    } else {
      alert('Product not available or out of stock');
    }
  };

  const handleRemoveItem = (index) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index, quantity) => {
    const updated = [...selectedItems];
    const num = parseInt(quantity) || 0;
    updated[index].quantity = num;
    setSelectedItems(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (selectedItems.length === 0) {
      alert('Please add items to the sale');
      return;
    }

    if(selectedCustomer == ''){
      alert('Please select a customer for the sale');
      return;
    }

    const subtotal = selectedItems.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
    const gstAmount = (subtotal * parseFloat(gstPercentage)) / 100;
    const totalAmount = subtotal + gstAmount;

    const saleData = {
      customerId: selectedCustomer || null,
      items: selectedItems,
      subtotal,
      gstPercentage: parseFloat(gstPercentage) || 0,
      gstAmount,
      totalAmount,
      paymentMethod,
      notes,
      saleDate: saleDate || new Date().toISOString().split('T')[0],
      dueDate: dueDate || null,
    };

    if (editingSaleId) {
      updateSale(editingSaleId, saleData);
      setEditingSaleId(null);
    } else {
      addSale(saleData);
    }

    setSelectedItems([]);
    setSelectedCustomer('');
    setPaymentMethod('cash');
    setGstPercentage('18');
    setNotes('');
    setSaleDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setShowForm(false);
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedItems([]);
    setSelectedCustomer('');
    setPaymentMethod('cash');
    setGstPercentage('18');
    setNotes('');
    setProductSelect('');
    setSaleDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
  };

  const getFilteredSales = () => {
    return sales.filter(sale => {
      const customerName = sale.customer_name || (customers.find(c => c.id === sale.customer_id)?.name || 'Walk-in');
      const saleDate = new Date(sale.created_at || sale.sale_date);
      
      // Search by customer name
      if (filters.searchCustomer && !customerName.toLowerCase().includes(filters.searchCustomer.toLowerCase())) {
        return false;
      }
      
      // Filter by payment method
      if (filters.paymentMethod && sale.payment_method !== filters.paymentMethod) {
        return false;
      }
      
      // Filter by date range
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        if (saleDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (saleDate > toDate) return false;
      }
      
      return true;
    });
  };

  const handleEditSale = (sale) => {
    setEditingSaleId(sale.id);
    setShowForm(true);
    setSelectedCustomer(sale.customer_id || '');
    setPaymentMethod(sale.payment_method || 'cash');
    setGstPercentage(String(parseInt(parseFloat(sale.gst_percentage) || 0)));
    setNotes(sale.notes || '');
    setSaleDate(sale.sale_date ? new Date(sale.sale_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setDueDate(sale.due_date ? new Date(sale.due_date).toISOString().split('T')[0] : '');
    
    // Reconstruct sale items
    const itemsArray = Array.isArray(sale.items) ? sale.items : [];
    const reconstructedItems = itemsArray
      .filter(item => item.product_name) // Filter out null items
      .map(item => {
        // Get current stock from inventory
        const currentProduct = inventory.find(p => String(p.id) === String(item.product_id));
        const currentStock = currentProduct ? (currentProduct.stock_quantity || currentProduct.stock || 0) : 0;
        
        return {
          productId: item.product_id,
          name: item.product_name,
          price: parseFloat(item.unit_price),
          quantity: item.quantity,
          stock: currentStock, // Show actual current stock from inventory
        };
      });
    
    setSelectedItems(reconstructedItems);
  };

  return (
    <div className="sales">
      <div className="sales-header">
        <h1>Sales Management</h1>
        <button 
          className="btn-primary" 
          onClick={() => {
            setEditingSaleId(null);
            setShowForm(!showForm);
            if (showForm) handleCancel();
          }}
        >
          {showForm ? 'Cancel' : '+ New Sale'}
        </button>
      </div>

      {showForm && (
        <div className="form-container">
          <h2>{editingSaleId ? 'Edit Sale' : 'Record New Sale'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Select Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                >
                  <option value="">-- No Customer --</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div className="form-group">
                <label>GST Percentage</label>
                <select
                  value={gstPercentage}
                  onChange={(e) => setGstPercentage(e.target.value)}
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Sale Date</label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={saleDate}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Add Products</label>
              <select value={productSelect} onChange={(e) => {
                handleAddItem(e.target.value);
              }}>
                <option value="">-- Select product to add --</option>
                {inventory
                  .filter(p => (p.stock_quantity || p.stock || 0) > 0)
                  .map(product => {
                    const stock = product.stock_quantity || product.stock || 0;
                    return (
                      <option key={product.id} value={product.id}>
                        {product.name} ({stock} in stock) - {product.price}
                      </option>
                    );
                  })}
              </select>
            </div>

            {selectedItems.length > 0 && (
              <div className="sale-items">
                <h3>Sale Items</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>In-Stock</th>
                      <th>Quantity</th>
                      <th>Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>{parseFloat(item.price).toFixed(2)}</td>
                        <td>{item.stock || item.stock_quantity || 0}</td>
                        <td>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                            min="1"
                            max="1000"
                          />
                        </td>
                        <td>{(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}</td>
                        <td>
                          <button 
                            type="button"
                            className="btn-action delete"
                            onClick={() => handleRemoveItem(index)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="sale-summary">
                  {(() => {
                    const subtotal = selectedItems.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
                    const gstAmount = (subtotal * parseFloat(gstPercentage)) / 100;
                    const total = subtotal + gstAmount;
                    return (
                      <div>
                        <div className="summary-row"><span>Subtotal:</span> <strong>{subtotal.toFixed(2)}</strong></div>
                        <div className="summary-row"><span>GST ({gstPercentage}%):</span> <strong>{gstAmount.toFixed(2)}</strong></div>
                        <div className="summary-row total"><span>Total Amount:</span> <strong>{total.toFixed(2)}</strong></div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="3"
                placeholder="Add sale notes..."
              ></textarea>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">{editingSaleId ? 'Update Sale' : 'Complete Sale'}</button>
              <button type="button" className="btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="filters-section">
        <div className="filter-group">
          <label>Search Customer</label>
          <input
            type="text"
            placeholder="Search customer name..."
            value={filters.searchCustomer}
            onChange={(e) => setFilters({ ...filters, searchCustomer: e.target.value })}
            className="filter-input"
          />
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
            <option value="card">Card</option>
            <option value="upi">UPI</option>
            <option value="bank">Bank Transfer</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Date From</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <label>Date To</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="filter-input"
          />
        </div>
      </div>

      <div className="sales-list">
        <h2>Sales History</h2>
        {getFilteredSales().length === 0 ? (
          <p className="no-data">No sales found</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Sale ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>GST</th>
                <th>Total Amount</th>
                <th>Payment</th>
                <th>Sale Date</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredSales().map(sale => {
                const customer = sale.customer_id ? customers.find(c => c.id === sale.customer_id) : null;
                const customerName = sale.customer_name || customer?.name || 'Walk-in Customer';
                const subtotal = sale.subtotal || 0;
                const gstAmount = sale.gst_amount || 0;
                const totalAmount = sale.total_amount || sale.totalAmount || 0;
                const gstPercentageVal = sale.gst_percentage || 0;
                const paymentMethod = sale.payment_method || sale.paymentMethod || 'cash';
                const saleDate = sale.created_at || sale.createdAt || new Date().toISOString();
                const itemsArray = Array.isArray(sale.items) ? sale.items : [];
                return (
                  <tr key={sale.id}>
                    <td>{sale.id}</td>
                    <td>{customerName}</td>
                    <td>{itemsArray.length}</td>
                    <td>{parseFloat(subtotal).toFixed(2)}</td>
                    <td>{parseFloat(gstAmount).toFixed(2)} ({gstPercentageVal}%)</td>
                    <td>{parseFloat(totalAmount).toFixed(2)}</td>
                    <td className="payment-method">{paymentMethod}</td>
                    <td>{new Date(sale.sale_date || saleDate).toLocaleDateString()}</td>
                    <td>{sale.due_date ? new Date(sale.due_date).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <button 
                        className="btn-action edit"
                        onClick={() => handleEditSale(sale)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn-action delete"
                        onClick={() => {
                          if (window.confirm('Delete this sale?')) {
                            deleteSale(sale.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Sales;
