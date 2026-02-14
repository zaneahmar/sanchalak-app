import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { ToasterProvider } from './context/ToasterContext';
import { AuthProvider } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Toaster from './components/Toaster';
import ProtectedRoute from './components/ProtectedRoute';
import TokenExpirationHandler from './components/TokenExpirationHandler';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Billing from './pages/Billing';
import Vendors from './pages/Vendors';
import PurchaseOrders from './pages/PurchaseOrders';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import DuesReport from './pages/DuesReport';
import CustomerDebitCredit from './pages/CustomerDebitCredit';
import VendorDebitCredit from './pages/VendorDebitCredit';
import UserProfile from './pages/UserProfile';
import './App.css';

function AppContent() {
  const { isBlurred, toggleBlur } = require('./context/DataContext').useData();
  const { isAuthenticated } = require('./context/AuthContext').useAuth();

  if (!isAuthenticated) {
    return null; // Login page is shown by Router
  }

  return (
    <div className="App">
      <Sidebar />
      <Toaster />
      
      <div className={`app-container ${isBlurred ? 'blurred' : ''}`}>
        <header className="app-header">
          <div className="header-content">
            <div>
              <h1>Sanchalak Store</h1>
              <p>Wholesale Management System</p>
            </div>
            <button 
              className={`btn-blur-toggle ${isBlurred ? 'active' : ''}`}
              onClick={toggleBlur}
              title={isBlurred ? '🔒 Click to Undo' : 'Lock'}
            >
              {isBlurred ? '🔒 Click to Unlock' : 'Lock'}
            </button>
          </div>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:customerId/debit-credit" element={<CustomerDebitCredit />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/vendors/:vendorId/debit-credit" element={<VendorDebitCredit />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/dues-report" element={<DuesReport />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/profile" element={<UserProfile />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>&copy; 2026 Sanchalak Store - Wholesale Management System. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

function App() {
  return (
    <ToasterProvider>
      <AuthProvider>
        <DataProvider>
          <Router>
            <TokenExpirationHandler />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <AppContent />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
        </DataProvider>
      </AuthProvider>
    </ToasterProvider>
  );
}

export default App;
