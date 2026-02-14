import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import '../styles/PurchaseOrders.css';

function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [expandedPO, setExpandedPO] = useState(null);
  const [filters, setFilters] = useState({
    searchTerm: '',
    vendor: '',
    status: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    po_number: '',
    vendor_id: '',
    total_amount: 0,
    status: 'pending',
    notes: '',
    expected_delivery: '',
    items: [],
  });
  const [currentItem, setCurrentItem] = useState({
    product_name: '',
    size: '',
    quantity: '',
    unit_price: '',
    hsn_code: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordersRes, vendorsRes, productsRes] = await Promise.all([
        api.get('/purchase-orders'),
        api.get('/vendors'),
        api.get('/products'),
      ]);
      
      console.log('Vendors Response:', vendorsRes);
      console.log('Products Response:', productsRes);
      console.log('Orders Response:', ordersRes);
      
      // Fetch items for each purchase order
      const ordersWithItems = await Promise.all(
        (Array.isArray(ordersRes) ? ordersRes : ordersRes.data || []).map(async (order) => {
          try {
            const itemsRes = await api.get(`/purchase-orders/${order.id}`);
            return { ...order, items: (itemsRes.items || itemsRes.data?.items) || [] };
          } catch (error) {
            console.error(`Error fetching items for PO ${order.id}:`, error);
            return { ...order, items: [] };
          }
        })
      );
      
      const vendorsData = Array.isArray(vendorsRes) ? vendorsRes : (vendorsRes.data || []);
      const productsData = Array.isArray(productsRes) ? productsRes : (productsRes.data || []);
      
      console.log('Parsed Vendors:', vendorsData);
      console.log('Parsed Products:', productsData);
      
      setOrders(ordersWithItems);
      setVendors(vendorsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const generatePoNumber = () => {
    return `PO-${Date.now()}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'total_amount' ? parseFloat(value) : value,
    }));
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'unit_price' ? parseFloat(value) : value,
    }));
  };

  const addItem = () => {
    if (currentItem.product_name && currentItem.size && currentItem.quantity > 0 && currentItem.unit_price > 0) {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, { ...currentItem, id: Date.now() }],
        total_amount: prev.total_amount + (currentItem.quantity * currentItem.unit_price),
      }));
      setCurrentItem({ product_name: '', size: '', quantity: 1, unit_price: 0, hsn_code: '' });
    }
  };

  const removeItem = (itemId) => {
    const item = formData.items.find(i => i.id === itemId);
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== itemId),
      total_amount: prev.total_amount - (item.quantity * item.unit_price),
    }));
  };

  const updateItem = (itemId, updatedFields) => {
    setFormData(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === itemId) {
          // Calculate old amount to subtract from total
          const oldAmount = item.quantity * item.unit_price;
          const newItem = { ...item, ...updatedFields };
          // Calculate new amount to add to total
          const newAmount = newItem.quantity * newItem.unit_price;
          const amountDifference = newAmount - oldAmount;
          
          return newItem;
        }
        return item;
      });
      
      // Recalculate total amount
      const newTotal = updatedItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      return {
        ...prev,
        items: updatedItems,
        total_amount: newTotal,
      };
    });
  };

   const handleSubmit = async (e) => {
  e.preventDefault();
  console.log('Form submitted - editingId:', editingId, 'formData:', formData);
  
  try {
    // Validation
    if (!formData.vendor_id) {
      alert('Please select a vendor');
      return;
    }

    if (formData.items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    const vendorId = parseInt(formData.vendor_id);
    if (isNaN(vendorId)) {
      alert('Invalid vendor selected');
      return;
    }

    const dataToSend = {
      po_number: formData.po_number,
      vendor_id: vendorId,
      total_amount: parseFloat(formData.total_amount) || 0,
      status: formData.status,
      notes: formData.notes,
      expected_delivery: formData.expected_delivery ? formData.expected_delivery : null,
      items: formData.items.map(item => ({
        product_name: item.product_name,
        size: item.size,
        hsn_code: item.hsn_code || '',
        quantity: parseInt(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
      })),
    };

    console.log('Sending data to API:', dataToSend);

    let response;
    if (editingId) {
      console.log('Updating PO with ID:', editingId);
      response = await api.put(`/purchase-orders/${editingId}`, dataToSend);
      console.log('Update response:', response);
      alert('Purchase Order updated successfully!');
    } else {
      console.log('Creating new PO');
      response = await api.post('/purchase-orders', dataToSend);
      console.log('Create response:', response);
      alert('Purchase Order created successfully!');
    }

    // Reset form
    setFormData({
      po_number: '',
      vendor_id: '',
      total_amount: 0,
      status: 'pending',
      notes: '',
      expected_delivery: '',
      items: [],
    });
    setCurrentItem({ product_name: '', size: '', quantity: '', unit_price: '', hsn_code: '' });
    setEditingId(null);
    setEditingItemId(null);
    setShowForm(false);
    
    // Refresh data
    await fetchData();
  } catch (error) {
    console.error('Error saving purchase order:', error);
    alert('Error saving purchase order: ' + (error.response?.data?.error || error.message));
  }
};

  const handleEdit = async (order) => {
    try {
      // Fetch the full PO details with items
      const poDetails = await api.get(`/purchase-orders/${order.id}`);
      
      // Format expected_delivery for datetime-local input
      let formattedDeliveryDate = '';
      if (poDetails.expected_delivery) {
        const date = new Date(poDetails.expected_delivery);
        formattedDeliveryDate = date.toISOString().slice(0, 16);
      }
      
      setFormData({
        po_number: poDetails.po_number,
        vendor_id: poDetails.vendor_id,
        total_amount: parseFloat(poDetails.total_amount) || 0,
        status: poDetails.status,
        notes: poDetails.notes,
        expected_delivery: formattedDeliveryDate,
        items: (poDetails.items || []).map(item => ({
          ...item,
          id: item.id,
          product_name: item.product_name,
          size: item.size,
          hsn_code: item.hsn_code || '',
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price),
        })),
      });
      setEditingId(order.id);
      setShowForm(true);
    } catch (error) {
      console.error('Error fetching purchase order details:', error);
      alert('Error loading purchase order details');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      try {
        await api.delete(`/purchase-orders/${id}`);
        fetchData();
      } catch (error) {
        console.error('Error deleting purchase order:', error);
      }
    }
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Unknown';
  };

  const getVendorName = (vendorId) => {
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor ? vendor.name : 'Unknown';
  };

  const formatCurrency = (amount) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const getFilteredOrders = () => {
    return orders.filter(order => {
      const poNumber = order.po_number || '';
      const vendorName = getVendorName(order.vendor_id).toLowerCase();
      
      // Search filter
      if (filters.searchTerm && !poNumber.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }
      
      // Vendor filter
      if (filters.vendor && parseInt(order.vendor_id) !== parseInt(filters.vendor)) {
        return false;
      }
      
      // Status filter
      if (filters.status && order.status !== filters.status) {
        return false;
      }
      
      return true;
    });
  };

  return (
    <div className="purchase-orders-page">
      <div className="po-header">
        <h1>Purchase Orders</h1>
        <button 
          className="btn-primary" 
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({
              po_number: generatePoNumber(),
              vendor_id: '',
              total_amount: 0,
              status: 'pending',
              notes: '',
              expected_delivery: '',
              items: [],
            });
          }}
        >
          {showForm ? 'Cancel' : '+ Create PO'}
        </button>
      </div>

      {showForm && (
        <form className="po-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Order Details</h3>
            <div className="form-grid">
              <input
                type="text"
                name="po_number"
                placeholder="PO Number"
                value={formData.po_number}
                onChange={handleInputChange}
                disabled
              />
              <select
                name="vendor_id"
                value={formData.vendor_id}
                onChange={handleInputChange}
                required
              >
                <option value="">
                  {vendors.length === 0 ? 'No vendors available' : 'Select Vendor'}
                </option>
                {Array.isArray(vendors) && vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <input
                type="datetime-local"
                name="expected_delivery"
                value={formData.expected_delivery}
                onChange={handleInputChange}
              />
            </div>
            <textarea
              name="notes"
              placeholder="Notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="3"
            />
          </div>

          <div className="form-section">
            <h3>Add Items</h3>
            <div className="form-grid">
              <input
                type="text"
                name="product_name"
                placeholder="Product Name"
                value={currentItem.product_name}
                onChange={handleItemChange}
              />
              <input
                type="text"
                name="size"
                placeholder="Size"
                value={currentItem.size}
                onChange={handleItemChange}
              />
              <input
                type="text"
                name="hsn_code"
                placeholder="HSN Code (Optional)"
                value={currentItem.hsn_code}
                onChange={handleItemChange}
              />
              <input
                type="number"
                name="quantity"
                placeholder="Quantity"
                value={currentItem.quantity}
                onChange={handleItemChange}
              />
              <input
                type="number"
                name="unit_price"
                placeholder="Unit Price"
                value={currentItem.unit_price}
                onChange={handleItemChange}
              />
              <button type="button" className="btn-add-item" onClick={addItem}>
                Add Item
              </button>
            </div>

            {formData.items.length > 0 && (
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Size</th>
                    <th>HSN Code</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map(item => (
                    <tr key={item.id}>
                      {editingItemId === item.id ? (
                        <>
                          <td>
                            <input
                              type="text"
                              value={item.product_name}
                              onChange={(e) => updateItem(item.id, { product_name: e.target.value })}
                              placeholder="Product Name"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={item.size}
                              onChange={(e) => updateItem(item.id, { size: e.target.value })}
                              placeholder="Size"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={item.hsn_code || ''}
                              onChange={(e) => updateItem(item.id, { hsn_code: e.target.value })}
                              placeholder="HSN Code"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                              placeholder="Quantity"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => updateItem(item.id, { unit_price: parseFloat(e.target.value) || 0 })}
                              placeholder="Unit Price"
                            />
                          </td>
                          <td>{formatCurrency(item.quantity * parseFloat(item.unit_price))}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-save"
                              onClick={() => setEditingItemId(null)}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn-remove"
                              onClick={() => removeItem(item.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{item.product_name}</td>
                          <td>{item.size}</td>
                          <td>{item.hsn_code || '-'}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.unit_price)}</td>
                          <td>{formatCurrency(item.quantity * parseFloat(item.unit_price))}</td>
                          <td>
                            {editingId && (
                              <button
                                type="button"
                                className="btn-edit"
                                onClick={() => setEditingItemId(item.id)}
                              >
                                Edit
                              </button>
                            )}
                            <button 
                              type="button"
                              className="btn-remove"
                              onClick={() => removeItem(item.id)}
                            >
                              Remove
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="form-summary">
            <h3>Total Amount: {formatCurrency(formData.total_amount)}</h3>
          </div>

          <button type="submit" className="btn-submit">
            {editingId ? 'Update PO' : 'Create PO'}
          </button>
        </form>
      )}

      <div className="filters-section">
        <div className="filter-group">
          <label>Search PO</label>
          <input
            type="text"
            placeholder="Search PO Number..."
            value={filters.searchTerm}
            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <label>Vendor</label>
          <select
            value={filters.vendor}
            onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
            className="filter-select"
          >
            <option value="">All Vendors</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="pos-table">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>PO Number</th>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Expected Delivery</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const filteredOrders = getFilteredOrders();
              const startIndex = (currentPage - 1) * itemsPerPage;
              const endIndex = startIndex + itemsPerPage;
              const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
              
              if (paginatedOrders.length === 0 && filteredOrders.length > 0) {
                return (
                  <tr>
                    <td colSpan="7" className="no-data">No purchase orders found on this page</td>
                  </tr>
                );
              }
              
              return paginatedOrders.map(order => (
                <React.Fragment key={order.id}>
                  <tr>
                    <td>
                      <button 
                        className="btn-expand"
                        onClick={() => setExpandedPO(expandedPO === order.id ? null : order.id)}
                      >
                        {expandedPO === order.id ? '▼' : '▶'}
                      </button>
                    </td>
                    <td>{order.po_number}</td>
                    <td>{getVendorName(order.vendor_id)}</td>
                    <td>{formatCurrency(order.total_amount)}</td>
                    <td>
                      <span className={`status ${order.status}`}>
                        {order.status && order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td>{order.expected_delivery ? new Date(order.expected_delivery).toLocaleDateString() : 'N/A'}</td>
                    <td className="actions">
                      <button className="btn-edit" onClick={() => handleEdit(order)}>Edit</button>
                      <button className="btn-delete" onClick={() => handleDelete(order.id)}>Delete</button>
                    </td>
                  </tr>
                  {expandedPO === order.id && order.items && order.items.length > 0 && (
                    <tr className="expand-row">
                      <td colSpan="7">
                        <div className="items-details">
                          <h4>Items in this Purchase Order</h4>
                          <table className="items-details-table">
                            <thead>
                              <tr>
                                <th>Product</th>
                                <th>Size</th>
                                <th>Quantity</th>
                                <th>HSN Code</th>
                                <th>Unit Price</th>
                                <th>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td>{item.product_name}</td>
                                <td>{item.size}</td>
                                <td>{item.quantity}</td>
                                <td>{item.hsn_code || '-'}</td>
                                <td>{formatCurrency(item.unit_price)}</td>
                                <td>{formatCurrency(item.quantity * parseFloat(item.unit_price))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
              ));
            })()}
          </tbody>
        </table>
        
        {(() => {
          const filteredOrders = getFilteredOrders();
          return filteredOrders.length > 0 && (
            <div className="pagination-controls">
              <div className="pagination-info">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
              </div>
              <div className="pagination-buttons">
                <button 
                  className="btn-pagination" 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="page-indicator">Page {currentPage} of {Math.ceil(filteredOrders.length / itemsPerPage)}</span>
                <button 
                  className="btn-pagination"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredOrders.length / itemsPerPage)))}
                  disabled={currentPage === Math.ceil(filteredOrders.length / itemsPerPage)}
                >
                  Next
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default PurchaseOrders;
