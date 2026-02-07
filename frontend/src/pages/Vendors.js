import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import '../styles/Vendors.css';

function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [gstVerification, setGstVerification] = useState({
    status: null, // null, 'verifying', 'valid', 'invalid'
    message: ''
  });
  const [filters, setFilters] = useState({
    searchTerm: '',
    city: '',
    state: '',
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    tax_id: '',
    bank_account: '',
    gstin: '',
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await api.get('/vendors');
      setVendors(response || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Reset GST verification when GSTIN changes
    if (name === 'gstin') {
      setGstVerification({
        status: null,
        message: ''
      });
    }
  };

  const verifyGST = async () => {
    if (!formData.gstin || formData.gstin.trim() === '') {
      setGstVerification({
        status: 'invalid',
        message: 'Please enter a GST number'
      });
      return;
    }

    setGstVerification({
      status: 'verifying',
      message: 'Verifying...'
    });

    try {
      const response = await api.post('/vendors/verify-gst', { 
        gstin: formData.gstin.toUpperCase() 
      });
      
      if (response.valid) {
        setGstVerification({
          status: 'valid',
          message: response.message || 'GST number is valid'
        });
        // Update form data with uppercase GST
        setFormData(prev => ({
          ...prev,
          gstin: formData.gstin.toUpperCase()
        }));
      } else {
        setGstVerification({
          status: 'invalid',
          message: response.message || 'GST number is invalid'
        });
      }
    } catch (error) {
      setGstVerification({
        status: 'invalid',
        message: error.response?.data?.message || 'Error verifying GST number'
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/vendors/${editingId}`, formData);
        setEditingId(null);
      } else {
        await api.post('/vendors', formData);
      }
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        tax_id: '',
        bank_account: '',
        gstin: '',
      });
      setShowForm(false);
      setGstVerification({
        status: null,
        message: ''
      });
      fetchVendors();
    } catch (error) {
      console.error('Error saving vendor:', error);
    }
  };

  const handleEdit = (vendor) => {
    setFormData(vendor);
    setEditingId(vendor.id);
    setShowForm(true);
    setGstVerification({
      status: null,
      message: ''
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      try {
        await api.delete(`/vendors/${id}`);
        fetchVendors();
      } catch (error) {
        console.error('Error deleting vendor:', error);
      }
    }
  };

  const getFilteredVendors = () => {
    return vendors.filter(vendor => {
      const name = vendor.name || '';
      const city = vendor.city || '';
      const state = vendor.state || '';
      
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

  return (
    <div className="vendors-page">
      <div className="vendors-header">
        <h1>Vendor Management</h1>
        <button 
          className="btn-primary" 
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({
              name: '',
              email: '',
              phone: '',
              address: '',
              city: '',
              state: '',
              zip_code: '',
              tax_id: '',
              bank_account: '',
              gstin: '',
            });
            setGstVerification({
              status: null,
              message: ''
            });
          }}
        >
          {showForm ? 'Cancel' : '+ Add Vendor'}
        </button>
      </div>

      {showForm && (
        <form className="vendor-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <input
              type="text"
              name="name"
              placeholder="Vendor Name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
            />
            <input
              type="tel"
              name="phone"
              placeholder="Phone"
              value={formData.phone}
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="address"
              placeholder="Address"
              value={formData.address}
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="city"
              placeholder="City"
              value={formData.city}
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="state"
              placeholder="State"
              value={formData.state}
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="zip_code"
              placeholder="ZIP Code"
              value={formData.zip_code}
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="tax_id"
              placeholder="Tax ID"
              value={formData.tax_id}
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="bank_account"
              placeholder="Bank Account"
              value={formData.bank_account}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="gstin-verification-section">
            <label className="gstin-label">GST Number (Optional)</label>
            <div className="gstin-input-wrapper">
              <input
                type="text"
                name="gstin"
                placeholder="GSTIN (e.g., 22AAAAA0000A1Z5)"
                value={formData.gstin}
                onChange={handleInputChange}
                className={`gstin-input ${gstVerification.status === 'valid' ? 'gstin-valid' : gstVerification.status === 'invalid' ? 'gstin-invalid' : ''}`}
                maxLength="15"
              />
              <button 
                type="button" 
                className="btn-verify-gst"
                onClick={verifyGST}
                disabled={gstVerification.status === 'verifying' || !formData.gstin}
              >
                {gstVerification.status === 'verifying' ? '⟳ Verifying...' : gstVerification.status === 'valid' ? '✓ Verified' : '🔍 Verify GST'}
              </button>
            </div>
            {gstVerification.message && (
              <div className={`gst-verification-message ${gstVerification.status}`}>
                {gstVerification.message}
              </div>
            )}
          </div>
          
          <button type="submit" className="btn-submit">
            {editingId ? 'Update Vendor' : 'Add Vendor'}
          </button>
        </form>
      )}

      <div className="filters-section">
        <div className="filter-group">
          <label>Search Vendor</label>
          <input
            type="text"
            placeholder="Search vendor name..."
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
            {[...new Set(vendors.map(v => v.city).filter(Boolean))].sort().map(city => (
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
            {[...new Set(vendors.map(v => v.state).filter(Boolean))].sort().map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="vendors-grid">
        {getFilteredVendors().length === 0 ? (
          <p className="no-data">No vendors found</p>
        ) : (
          getFilteredVendors().map(vendor => (
            <div key={vendor.id} className="vendor-card">
              <div className="vendor-header">
                <h3>{vendor.name}</h3>
                {vendor.gstin && <p className="vendor-gstin">GSTIN: {vendor.gstin}</p>}
              </div>
              
              <div className="vendor-details">
                {vendor.phone && <p><strong>Phone:</strong> {vendor.phone}</p>}
                {vendor.email && <p><strong>Email:</strong> {vendor.email}</p>}
                {vendor.address && <p><strong>Address:</strong> {vendor.address}</p>}
                {vendor.city && <p><strong>City:</strong> {vendor.city}</p>}
                {vendor.state && <p><strong>State:</strong> {vendor.state}</p>}
                {vendor.zip_code && <p><strong>Zip Code:</strong> {vendor.zip_code}</p>}
                {vendor.tax_id && <p><strong>Tax ID:</strong> {vendor.tax_id}</p>}
                {vendor.bank_account && <p><strong>Bank Account:</strong> {vendor.bank_account}</p>}
              </div>

              <div className="vendor-actions">
                <Link 
                  to={`/vendors/${vendor.id}/debit-credit`}
                  className="btn-action debit-credit"
                >
                  Debit/Credit
                </Link>
                <button 
                  className="btn-action edit"
                  onClick={() => handleEdit(vendor)}
                >
                  Edit
                </button>
                <button 
                  className="btn-action delete"
                  onClick={() => handleDelete(vendor.id)}
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
}

export default Vendors;
