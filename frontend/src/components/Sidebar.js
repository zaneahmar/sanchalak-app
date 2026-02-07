import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaBox,
  FaUsers,
  FaShoppingCart,
  FaChartLine,
  FaFileInvoiceDollar,
  FaBars,
  FaTimes,
  FaSignOutAlt,
  FaTruck,
  FaMoneyBillWave,
  FaChartPie,
  FaClipboardList
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

function Sidebar() {
  const [isOpen, setIsOpen] = useState(window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [location, isMobile]);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: FaTachometerAlt },
    { path: '/inventory', label: 'Inventory', icon: FaBox },
    { path: '/purchase-orders', label: 'Purchase Orders', icon: FaShoppingCart },
    { path: '/vendors', label: 'Vendors', icon: FaTruck },
    { path: '/customers', label: 'Customers', icon: FaUsers },
    { path: '/sales', label: 'Sales', icon: FaChartLine },
    { path: '/billing', label: 'Billing', icon: FaFileInvoiceDollar },
    // { path: '/orders', label: 'Orders', icon: FaShoppingCart },
    { path: '/payments', label: 'Payments', icon: FaMoneyBillWave },
    { path: '/dues-report', label: 'Dues Report', icon: FaClipboardList },
    { path: '/reports', label: 'Reports', icon: FaChartPie },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      {isMobile && (
        <button
          className="mobile-menu-toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Menu"
        >
          <FaBars />
        </button>
      )}

      {/* Overlay for mobile */}
      <div 
        className={`sidebar-overlay ${isOpen && isMobile ? 'active' : ''}`}
        onClick={() => setIsOpen(false)}
      />

      <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <button
          className="toggle-btn"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Sidebar"
        >
          {isOpen ? <FaTimes /> : <FaBars />}
        </button>

      <div className="sidebar-header">
        {isOpen && <h2>Menu</h2>}
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path} className="nav-item">
                <Link to={item.path} className="nav-link" title={item.label}>
                  <Icon className="nav-icon" />
                  {isOpen && <span className="nav-label">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {isOpen && (
        <div className="sidebar-footer">
          {user && (
            <div className="user-info">
              <Link to="/profile" className="user-name-link">
                <p className="user-name">👤 {user.username}</p>
              </Link>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="btn-logout"
            title="Logout"
          >
            <FaSignOutAlt className="logout-icon" />
            {isOpen && <span>Logout</span>}
          </button>
          <p className="footer-text">© 2026 Sanchalak Store</p>
        </div>
      )}
    </div>
    </>
  );
}

export default Sidebar;
