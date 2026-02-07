import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import '../styles/Customers.css';

const Customers = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, loading, error } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [filters, setFilters] = useState({
    searchTerm: '',
    city: '',
    state: '',
  });
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    businessName: '',
  });

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
      if (!formData.name || !formData.email || !formData.phone) {
        setFormError('Name, email, and phone are required');
        setFormLoading(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setFormError('Please enter a valid email address');
        setFormLoading(false);
        return;
      }

      // Check if email is already in use (when creating new or changing existing)
      const emailExists = customers.some(
        (customer) =>
          customer.email.toLowerCase() === formData.email.toLowerCase() &&
          customer.id !== editingId
      );

      if (emailExists) {
        setFormError('This email is already in use by another customer');
        setFormLoading(false);
        return;
      }

      if (editingId) {
        await updateCustomer(editingId, formData);
        setEditingId(null);
      } else {
        await addCustomer(formData);
      }

      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        businessName: '',
      });
      setShowForm(false);
    } catch (err) {
      setFormError(err.message || 'Error saving customer');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (customer) => {
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      zipCode: customer.zip_code || '',
      businessName: customer.businessName || '',
    });
    setEditingId(customer.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteCustomer(id);
      } catch (err) {
        alert('Error deleting customer: ' + err.message);
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormError('');
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      businessName: '',
    });
  };

  const getFilteredCustomers = () => {
    return customers.filter(customer => {
      const name = customer.name || '';
      const city = customer.city || '';
      const state = customer.state || '';
      
      // Search filter
      if (filters.searchTerm && !name.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }
      
      // City filter
      if (filters.city && city !== filters.city) {
        return false;
      }
      
      // State filter
      if (filters.state && state !== filters.state) {
        return false;
      }
      
      return true;
    });
  };

  if (loading) {
    return <div className="customers"><p className="loading">Loading customers...</p></div>;
  }

  return (
    <div className="customers">
      <div className="customers-header">
        <h1>Customer Management</h1>
        <button 
          className="btn-primary" 
          onClick={() => setShowForm(!showForm)}
          disabled={formLoading}
        >
          {showForm ? 'Cancel' : '+ Add New Customer'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {formError && <div className="error-message">{formError}</div>}

      {showForm && (
        <div className="form-container">
          <h2>{editingId ? 'Edit Customer' : 'Add New Customer'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={formLoading}
                />
              </div>
              <div className="form-group">
                <label>Business Name</label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  disabled={formLoading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  disabled={formLoading}
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={formLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={formLoading}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  disabled={formLoading}
                />
              </div>
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  disabled={formLoading}
                />
              </div>
              <div className="form-group">
                <label>Zip Code</label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  disabled={formLoading}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-success" disabled={formLoading}>
                {formLoading ? 'Saving...' : (editingId ? 'Update Customer' : 'Add Customer')}
              </button>
              <button type="button" className=" btn-secondary" onClick={handleCancel} disabled={formLoading}>
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
            value={filters.searchTerm}
            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <label>City</label>
          <select
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            className="filter-select"
          >
            <option value="">All Cities</option>
            {[...new Set(customers.map(c => c.city).filter(Boolean))].sort().map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>State</label>
          <select
            value={filters.state}
            onChange={(e) => setFilters({ ...filters, state: e.target.value })}
            className="filter-select"
          >
            <option value="">All States</option>
            {[...new Set(customers.map(c => c.state).filter(Boolean))].sort().map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="customers-grid">
        {getFilteredCustomers().length === 0 ? (
          <p className="no-data">No customers found</p>
        ) : (
          getFilteredCustomers().map(customer => (
            <div key={customer.id} className="customer-card">
              <div className="customer-header">
                <h3>{customer.name}</h3>
                {customer.businessName && <p className="business-name">{customer.businessName}</p>}
              </div>
              
              <div className="customer-details">
                <p><strong>Phone:</strong> {customer.phone}</p>
                {customer.email && <p><strong>Email:</strong> {customer.email}</p>}
                {customer.address && <p><strong>Address:</strong> {customer.address}</p>}
                {customer.city && <p><strong>City:</strong> {customer.city}</p>}
                {customer.state && <p><strong>State:</strong> {customer.state}</p>}
                {customer.zip_code && <p><strong>Zip Code:</strong> {customer.zip_code}</p>}
              </div>

              <div className="customer-actions">
                <Link 
                  to={`/customers/${customer.id}/debit-credit`}
                  className="btn-action debit-credit"
                >
                  Debit/Credit
                </Link>
                <button 
                  className="btn-action edit"
                  onClick={() => handleEdit(customer)}
                  disabled={formLoading}
                >
                  Edit
                </button>
                <button 
                  className="btn-action delete"
                  onClick={() => handleDelete(customer.id)}
                  disabled={formLoading}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Customers;
