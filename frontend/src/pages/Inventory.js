import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { purchaseOrderAPI } from '../services/api';
import '../styles/Inventory.css';

const Inventory = () => {
  const { inventory, addProduct, updateProduct, deleteProduct, loading, error } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [purchasedProducts, setPurchasedProducts] = useState([]);
  const [filters, setFilters] = useState({
    searchTerm: '',
    stockStatus: 'all', // 'all', 'low', 'out', 'in-stock'
    category: '',
  });
  const [formData, setFormData] = useState({
    name: '',
    hsn: '',
    size: '',
    color: '',
    price: '',
    cost: '',
    stock: '',
    description: '',
  });

  // Load purchased products on mount
  useEffect(() => {
    loadPurchasedProducts();
  }, []);

  const loadPurchasedProducts = async () => {
    try {
      const products = await purchaseOrderAPI.getDropdownProducts();
      console.log('Dropdown products:', products);
      
      // Transform API response to match expected format
      const formattedProducts = products.map((item, index) => ({
        id: item.product_name || `Product-${index}`,
        name: item.product_name || `Product ${index}`,
        size: item.size || '',
        cost: parseFloat(item.unit_price) || 0,
        stock: parseInt(item.quantity) || 0,
        hsn: item.hsn_code || '',
      }));
      
      console.log('Formatted products for dropdown:', formattedProducts);
      setPurchasedProducts(formattedProducts);
    } catch (err) {
      console.error('Error loading purchased products:', err);
    }
  };

  const handleProductSelect = (e) => {
  const selectedId = e.target.value;
  const selectedProduct = purchasedProducts.find(p => p.id === selectedId);
  
  if (selectedProduct) {
    console.log('Selected product:', selectedProduct);
    setFormData(prev => ({
      ...prev,
      name: selectedProduct.name,
      size: selectedProduct.size || '',
      cost: selectedProduct.cost || '',
      stock: selectedProduct.stock || '',
      hsn: selectedProduct.hsn || '',
    }));
  }
  setFormError('');
};

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    
    try {
      if (!formData.name || !formData.price || !formData.cost || !formData.stock) {
        setFormError('Please fill in all required fields');
        setFormLoading(false);
        return;
      }

      if (editingId) {
        await updateProduct(editingId, {
          ...formData,
          price: parseFloat(formData.price),
          cost: parseFloat(formData.cost),
          stock: parseInt(formData.stock),
        });
      } else {
        await addProduct({
          ...formData,
          price: parseFloat(formData.price),
          cost: parseFloat(formData.cost),
          stock: parseInt(formData.stock),
        });
      }

      setFormData({
        name: '',
        hsn: '',
        size: '',
        color: '',
        price: '',
        cost: '',
        stock: '',
        description: '',
      });
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      setFormError(err.message || 'Error saving product');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name || '',
      hsn: product.hsn || '',
      size: product.category || '',
      color: product.color || '',
      price: product.price || '',
      cost: product.cost || '',
      stock: product.stock_quantity || product.stock || '',
      description: product.description || '',
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
      } catch (err) {
        alert('Error deleting product: ' + err.message);
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormError('');
    setFormData({
      name: '',
      hsn: '',
      size: '',
      color: '',
      price: '',
      cost: '',
      stock: '',
      description: '',
    });
  };

  const filteredInventory = useMemo(() => {
    const filtered = inventory.filter(product => {
      const stock = parseInt(product.stock_quantity || product.stock || 0);
      const name = product.name || '';
      const category = product.category || product.size || '';
      
      // Search filter
      if (filters.searchTerm && !name.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }
      
      // Stock status filter
      if (filters.stockStatus !== 'all') {
        if (filters.stockStatus === 'low') {
          const isLowStock = stock > 0 && stock <= 10;
          if (!isLowStock) return false;
        } else if (filters.stockStatus === 'out') {
          if (stock > 0) return false;
        } else if (filters.stockStatus === 'in-stock') {
          if (stock <= 0) return false;
        }
      }
      
      // Category filter
      if (filters.category && category !== filters.category) {
        return false;
      }
      
      return true;
    });
    
    console.log('Filter Applied:', filters.stockStatus, 'Total inventory:', inventory.length, 'Filtered:', filtered.length);
    return filtered;
  }, [inventory, filters]);

  if (loading) {
    return <div className="inventory"><p className="loading">Loading inventory...</p></div>;
  }

  return (
    <div className="inventory">
      <div className="inventory-header">
        <h1>Inventory Management</h1>
        <button 
          className="btn-primary" 
          onClick={() => setShowForm(!showForm)}
          disabled={formLoading}
        >
          {showForm ? 'Cancel' : '+ Add New Product'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {formError && <div className="error-message">{formError}</div>}

      {showForm && (
        <div className="form-container">
          <h2>{editingId ? 'Edit Product' : 'Add New Product'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Product Name {!editingId }</label>
                {!editingId ? (
                  <select
                    onChange={handleProductSelect}
                    disabled={formLoading}
                    defaultValue=""
                  >
                    <option value="">-- Select a product --</option>
                    {purchasedProducts && purchasedProducts.length > 0 ? (
                      purchasedProducts
                        .filter(product => !inventory.some(inv => inv.name === product.name))
                        .map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))
                    ) : (
                      <option disabled>No purchased products available</option>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={formLoading}
                  />
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>HSN Code</label>
                <input
                  type="text"
                  name="hsn"
                  value={formData.hsn}
                  onChange={handleChange}
                  placeholder="e.g., 6401"
                  disabled={formLoading}
                />
              </div>
              <div className="form-group">
                <label>Size</label>
                <input
                  type="text"
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  placeholder="e.g., 6-13"
                  disabled={formLoading}
                />
              </div>
              <div className="form-group">
                <label>Color</label>
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  placeholder="e.g., Black"
                  disabled={formLoading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Cost Price (Unit Price) () *</label>
                <input
                  type="number"
                  name="cost"
                  value={formData.cost}
                  onChange={handleChange}
                  step="0.01"
                  required
                  disabled={formLoading}
                />
              </div>
              <div className="form-group">
                <label>Selling Price () *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  step="0.01"
                  required
                  disabled={formLoading}
                />
              </div>
              <div className="form-group">
                <label>Stock Quantity *</label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  required
                  disabled={formLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                disabled={formLoading}
              ></textarea>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={formLoading}>
                {formLoading ? 'Saving...' : (editingId ? 'Update Product' : 'Add Product')}
              </button>
              <button type="button" className="btn-secondary" onClick={handleCancel} disabled={formLoading}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="filters-section">
        <div className="filter-group">
          <label>Search Products</label>
          <input
            type="text"
            placeholder="Search products..."
            value={filters.searchTerm}
            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <label>Stock Status</label>
          <select
            value={filters.stockStatus}
            onChange={(e) => setFilters({ ...filters, stockStatus: e.target.value })}
            className="filter-select"
          >
            <option value="all">All Stock Status</option>
            <option value="in-stock">In Stock</option>
            <option value="low">Low Stock (≤10)</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Category</label>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="filter-select"
          >
            <option value="">All Categories</option>
            {[...new Set(inventory.map(p => p.category || p.size || '').filter(Boolean))].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="products-table">
        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Size</th>
              <th>Color</th>
              <th>Cost Price</th>
              <th>Selling Price</th>
              <th>Stock</th>
              <th>Margin</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.length === 0 ? (
              <tr>
                <td colSpan="9" className="no-data">No products found</td>
              </tr>
            ) : (
              filteredInventory.map(product => {
                const cost = parseFloat(product.cost || 0);
                const price = parseFloat(product.price || 0);
                const margin = cost > 0 ? ((price - cost) / cost * 100).toFixed(1) : 0;
                const stock = product.stock_quantity || product.stock || 0;
                return (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.category || product.size || '-'}</td>
                    <td>{product.color || '-'}</td>
                    <td>{cost.toFixed(2)}</td>
                    <td>{price.toFixed(2)}</td>
                    <td className={stock <= 10 ? 'low-stock' : ''}>
                      {stock}
                    </td>
                    <td>{margin}%</td>
                    <td>
                      <button 
                        className="btn-action edit"
                        onClick={() => handleEdit(product)}
                        disabled={formLoading}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn-action delete"
                        onClick={() => handleDelete(product.id)}
                        disabled={formLoading}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventory;
