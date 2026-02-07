import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import '../styles/Orders.css';

const Orders = () => {
  const { orders, inventory, customers, addOrder, updateOrderStatus, deleteOrder } = useData();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    selectedItems: [],
    notes: '',
  });

  const handleAddItem = (productId) => {
    if (!productId) return;
    const product = inventory.find(p => p.id === parseInt(productId));
    if (product) {
      setFormData({
        ...formData,
        selectedItems: [
          ...formData.selectedItems,
          {
            productId: product.id,
            name: product.name,
            price: parseFloat(product.price) || 0,
            quantity: 1,
            size: product.category || '', // Fetch size from product.category
          },
        ],
      });
    }
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      selectedItems: formData.selectedItems.filter((_, i) => i !== index),
    });
  };

  const handleQuantityChange = (index, quantity) => {
    const updated = [...formData.selectedItems];
    updated[index].quantity = parseInt(quantity) || 1;
    setFormData({
      ...formData,
      selectedItems: updated,
    });
  };

  const handleSizeChange = (index, size) => {
    const updated = [...formData.selectedItems];
    updated[index].size = size;
    setFormData({
      ...formData,
      selectedItems: updated,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.customerId || formData.selectedItems.length === 0) {
      alert('Please select a customer and add items');
      return;
    }

    const totalAmount = formData.selectedItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

    addOrder({
      customerId: formData.customerId,
      items: formData.selectedItems,
      totalAmount,
      notes: formData.notes,
    });

    setFormData({ customerId: '', selectedItems: [], notes: '' });
    setShowForm(false);
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({ customerId: '', selectedItems: [], notes: '' });
  };

  return (
    <div className="orders">
      <div className="orders-header">
        <h1>Order Management</h1>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Create New Order'}
        </button>
      </div>

      {showForm && (
        <div className="form-container">
          <h2>Create New Order</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Select Customer *</label>
              <select
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                required
              >
                <option value="">-- Choose a customer --</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </option>
                ))}
              </select>
              {customers.length === 0 && (
                <p style={{ color: '#ff6b6b', fontSize: '0.9rem', marginTop: '5px' }}>
                  No customers found. Please add customers first.
                </p>
              )}
            </div>

            <div className="form-group">
              <label>Select Products *</label>
              <select onChange={(e) => handleAddItem(e.target.value)} value="">
                <option value="">-- Add product to order --</option>
                {inventory.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {product.category} ({product.stock_quantity} in stock) - {product.price}
                  </option>
                ))}
              </select>
            </div>

            {formData.selectedItems.length > 0 && (
              <div className="order-items">
                <h3>Order Items</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Size</th>
                      <th>Quantity</th>
                      <th>Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.selectedItems.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>{parseFloat(item.price).toFixed(2)}</td>
                        <td>
                          {item.size}
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                            min="1"
                            max="100"
                          />
                        </td>
                        <td>{(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
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
                <div className="order-total">
                  <strong>Total Amount: {formData.selectedItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0).toFixed(2)}</strong>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="3"
                placeholder="Add order notes..."
              ></textarea>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-success">Create Order</button>
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="orders-list">
        <h2>Recent Orders</h2>
        {orders.length === 0 ? (
          <p className="no-data">No orders yet</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Total Amount</th>
                <th>Item Name</th>
                <th>Item Size</th>
                <th>Items</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const customer = customers.find(c => c.id === order.customer_id);
                return (
                  <tr key={order.id}>
                    <td>{order.id.toString().slice(0, 8)}</td>
                    <td>{customer?.name || 'Unknown'}</td>
                    <td>{parseFloat(order.total_amount || 0).toFixed(2)}</td>
                    <td>{order.product_name}</td>
                    <td>{order.category}</td>
                    <td>{Array.isArray(order.items) ? order.items.length : 0}</td>
                    <td>
                      <select 
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className={`status-${order.status}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td>{new Date(order.created_at || order.order_date).toLocaleDateString()}</td>
                    <td>
                      <button 
                        className="btn-action delete"
                        onClick={() => {
                          if (window.confirm('Delete this order?')) {
                            deleteOrder(order.id);
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

export default Orders;