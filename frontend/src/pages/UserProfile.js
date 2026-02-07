import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToaster } from '../context/ToasterContext';
import '../styles/UserProfile.css';

function UserProfile() {
  const { user, token, updateUserProfile } = useAuth();
  const { error, success } = useToaster();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    business_name: user?.business_name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    gstin: user?.gstin || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.business_name) {
      error('Name and Business Name are required');
      return;
    }

    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      error('Phone must be 10 digits');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://192.168.1.3:5000/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        // Update user in context
        updateUserProfile(data.user);
        success('Profile updated successfully');
        setIsEditing(false);
      } else {
        error(data.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Update profile error:', err);
      error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      business_name: user?.business_name || '',
      phone: user?.phone || '',
      address: user?.address || '',
      city: user?.city || '',
      gstin: user?.gstin || ''
    });
    setIsEditing(false);
  };

  return (
    <div className="user-profile-container">
      <div className="user-profile-card">
        <div className="profile-header">
          <h2>User Profile</h2>
          {!isEditing && (
            <button 
              className="btn btn-primary"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="business_name">Business Name *</label>
                <input
                  type="text"
                  id="business_name"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="disabled-field"
                  title="Email cannot be changed"
                />
                <small className="field-note">Email cannot be changed</small>
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10-digit number"
                  pattern="\d{10}"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="address">Address</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="gstin">GSTIN</label>
              <input
                type="text"
                id="gstin"
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                placeholder="22AAAAA0000A1Z5"
                maxLength="15"
              />
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-success"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-view">
            <div className="info-row">
              <div className="info-group">
                <label>Name</label>
                <p>{user?.name || '-'}</p>
              </div>

              <div className="info-group">
                <label>Business Name</label>
                <p>{user?.business_name || '-'}</p>
              </div>
            </div>

            <div className="info-row">
              <div className="info-group">
                <label>Email</label>
                <p>{user?.email || '-'}</p>
              </div>

              <div className="info-group">
                <label>Phone</label>
                <p>{user?.phone || '-'}</p>
              </div>
            </div>

            <div className="info-row">
              <div className="info-group">
                <label>Address</label>
                <p>{user?.address || '-'}</p>
              </div>

              <div className="info-group">
                <label>City</label>
                <p>{user?.city || '-'}</p>
              </div>
            </div>

            <div className="info-row">
              <div className="info-group">
                <label>GSTIN</label>
                <p>{user?.gstin || '-'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserProfile;
