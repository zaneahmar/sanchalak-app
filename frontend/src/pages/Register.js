import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/Login.css';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    business_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: '',
    phone: '',
    gstin: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [gstVerification, setGstVerification] = useState({
    isVerifying: false,
    isVerified: false,
    details: null,
    error: null
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
    
    // Reset GST verification when GSTIN changes
    if (name === 'gstin') {
      setGstVerification({
        isVerifying: false,
        isVerified: false,
        details: null,
        error: null
      });
    }
  };

  const handleVerifyGST = async () => {
    if (!formData.gstin || formData.gstin.trim() === '') {
      setGstVerification({
        ...gstVerification,
        error: 'Please enter GSTIN first',
        isVerified: false
      });
      return;
    }

    setGstVerification({
      isVerifying: true,
      isVerified: false,
      details: null,
      error: null
    });

    try {
      const response = await fetch('http://192.168.1.9:5000/api/auth/verify-gst', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gstin: formData.gstin }),
      });

      const data = await response.json();

      if (data.success) {
        setGstVerification({
          isVerifying: false,
          isVerified: true,
          details: data.gstDetails,
          error: null
        });
      } else {
        setGstVerification({
          isVerifying: false,
          isVerified: false,
          details: null,
          error: data.message || 'GST verification failed'
        });
      }
    } catch (error) {
      console.error('GST verification error:', error);
      setGstVerification({
        isVerifying: false,
        isVerified: false,
        details: null,
        error: 'Network error. Please try again.'
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      setIsLoading(false);
      return;
    }

    if (!formData.business_name.trim()) {
      setError('Business name is required');
      setIsLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      setIsLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Invalid email format');
      setIsLoading(false);
      return;
    }

    if (!formData.password) {
      setError('Password is required');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('http://192.168.1.9:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          business_name: formData.business_name,
          email: formData.email,
          password: formData.password,
          address: formData.address,
          city: formData.city,
          phone: formData.phone,
          gstin: formData.gstin
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Registration successful! Please wait for account activation, then you can login.');
        // Clear form
        setFormData({
          name: '',
          business_name: '',
          email: '',
          password: '',
          confirmPassword: '',
          address: '',
          city: '',
          phone: '',
          gstin: ''
        });
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-box register-box">
          <div className="login-header">
            <h1>Sanchalak Store</h1>
            <p>Create New Account</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form register-form">
            <div className="form-group">
              <label htmlFor="name">Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                disabled={isLoading}
                autoFocus
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
                placeholder="Enter your business name"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                disabled={isLoading}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <div className="password-input-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <div className="password-input-group">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="address">Address</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter your address"
                disabled={isLoading}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter your city"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="gstin">GSTIN</label>
              <div className="gstin-input-group">
                <input
                  type="text"
                  id="gstin"
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleChange}
                  placeholder="Enter GSTIN (e.g., 27AABCU9603R1ZM)"
                  disabled={isLoading}
                  maxLength={15}
                />
                <button
                  type="button"
                  className={`btn-verify-gst ${gstVerification.isVerified ? 'verified' : ''}`}
                  onClick={handleVerifyGST}
                  disabled={isLoading || gstVerification.isVerifying || !formData.gstin}
                  title="Verify GSTIN"
                >
                  {gstVerification.isVerifying ? '⏳' : gstVerification.isVerified ? '✅ Verified' : 'Verify'}
                </button>
              </div>
              {gstVerification.error && (
                <div className="gst-error">{gstVerification.error}</div>
              )}
              {gstVerification.isVerified && gstVerification.details && (
                <div className="gst-success">
                  ✓ Valid GSTIN - State: {gstVerification.details.stateName} ({gstVerification.details.stateCode})
                </div>
              )}
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button
              type="submit"
              className="btn-login"
              disabled={isLoading}
            >
              {isLoading ? 'Registering...' : 'Register'}
            </button>
          </form>

          <div className="register-link">
            <p>Already have an account? <Link to="/login">Login here</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
