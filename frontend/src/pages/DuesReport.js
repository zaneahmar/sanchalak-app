import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import '../styles/DuesReport.css';

function DuesReport() {
  const [duesData, setDuesData] = useState({
    customerDues: [],
    vendorDues: [],
    summary: {}
  });
  const [filterType, setFilterType] = useState('all'); // 'all', 'customer', 'vendor'
  const [filters, setFilters] = useState({
    searchTerm: '',
    dueStatus: '', // 'all', 'pending', 'overdue'
  });
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDuesReport();
  }, []);

  const fetchDuesReport = async () => {
    setLoading(true);
    try {
      const [customersRes, vendorsRes, paymentsRes, posRes, billingsRes] = await Promise.all([
        api.get('/customers'),
        api.get('/vendors'),
        api.get('/payments'),
        api.get('/purchase-orders'),
        api.get('/billing'),
      ]);

      const customers = Array.isArray(customersRes) ? customersRes : [];
      const vendors = Array.isArray(vendorsRes) ? vendorsRes : [];
      const payments = Array.isArray(paymentsRes) ? paymentsRes : [];
      const purchaseOrders = Array.isArray(posRes) ? posRes : [];
      const billings = Array.isArray(billingsRes) ? billingsRes : [];

      // Calculate customer dues
      const customerDues = customers.map(customer => {
        // Get all unpaid/partial billings for this customer
        const customerBillings = billings.filter(b => b.customer_id === customer.id && (b.status === 'unpaid' || b.status === 'partial'));
        
        // Calculate total due from unpaid/partial invoices
        const totalDue = customerBillings.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
        
        // Calculate paid amount
        const paidAmount = payments
          .filter(p => p.status === 'completed' && customerBillings.some(b => b.id === p.billing_id))
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        
        const pending = Math.max(0, totalDue - paidAmount);

        return {
          type: 'customer',
          id: customer.id,
          name: customer.name,
          totalDue,
          paid: paidAmount,
          pending,
          invoices: customer.total_invoices || 0,
          email: customer.email,
          phone: customer.phone
        };
      }).filter(c => c.pending > 0);

      // Calculate vendor dues
      const vendorDues = vendors.map(vendor => {
        // Get all POs for this vendor
        const vendorPOs = purchaseOrders.filter(po => po.vendor_id === vendor.id);
        
        // Calculate paid amount for all POs of this vendor
        const totalOrderAmount = vendorPOs.reduce((sum, po) => sum + parseFloat(po.total_amount || 0), 0);
        const paidAmount = payments
          .filter(p => {
            // Payment is for this vendor if it's linked to one of vendor's POs
            return vendorPOs.some(po => po.id === p.po_id) && p.status === 'completed';
          })
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

        const pending = Math.max(0, totalOrderAmount - paidAmount);

        return {
          type: 'vendor',
          id: vendor.id,
          name: vendor.name,
          totalDue: totalOrderAmount,
          paid: paidAmount,
          pending: pending,
          email: vendor.email,
          phone: vendor.phone
        };
      }).filter(v => v.pending > 0);

      // Calculate summary
      const totalCustomerDues = customerDues.reduce((sum, c) => sum + c.pending, 0);
      const totalVendorDues = vendorDues.reduce((sum, v) => sum + v.pending, 0);

      setDuesData({
        customerDues,
        vendorDues,
        summary: {
          totalCustomerDues,
          totalVendorDues,
          totalDues: totalCustomerDues + totalVendorDues,
          customerCount: customerDues.length,
          vendorCount: vendorDues.length
        }
      });
    } catch (error) {
      console.error('Error fetching dues report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const allDues = [
      ...duesData.customerDues.map(d => ({...d, type: 'Customer'})),
      ...duesData.vendorDues.map(d => ({...d, type: 'Vendor'}))
    ];

    let csv = 'Type,Entity,Total Due,Paid,Pending,Contact\n';
    allDues.forEach(due => {
      csv += `${due.type},${due.name},${due.totalDue || due.pending},${due.paid},${due.pending},"${due.email}"\n`;
    });

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `dues_report_${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getStatusColor = (pending) => {
    if (pending === 0) return '#4CAF50';
    if (pending < 10000) return '#FFC107';
    return '#F44336';
  };

  const filteredDues = () => {
    let dues;
    switch(filterType) {
      case 'customer':
        dues = duesData.customerDues;
        break;
      case 'vendor':
        dues = duesData.vendorDues;
        break;
      default:
        dues = [...duesData.customerDues, ...duesData.vendorDues];
    }
    
    // Apply search filter
    if (filters.searchTerm) {
      dues = dues.filter(d => d.name.toLowerCase().includes(filters.searchTerm.toLowerCase()));
    }
    
    // Apply due status filter
    if (filters.dueStatus) {
      if (filters.dueStatus === 'pending') {
        dues = dues.filter(d => d.pending > 0 && d.pending > 0);
      } else if (filters.dueStatus === 'overdue') {
        dues = dues.filter(d => d.pending > 10000);
      }
    }
    
    return dues;
  };

  if (loading) {
    return <div className="dues-report-page"><p>Loading dues report...</p></div>;
  }

  const dues = filteredDues();

  return (
    <div className="dues-report-page">
      <div className="report-header">
        <h1>Dues & Receivables Report</h1>
        <div className="header-actions">
          <button className="btn-primary" onClick={fetchDuesReport}>🔄 Refresh</button>
          <button className="btn-secondary" onClick={handleExport}>📥 Export CSV</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="report-summary">
        <div className="summary-card">
          <h3>Total Outstanding Dues</h3>
          <p className="amount">{parseFloat(duesData.summary.totalDues || 0).toFixed(2)}</p>
          <span className="meta">Across all entities</span>
        </div>
        <div className="summary-card">
          <h3>Customer Receivables</h3>
          <p className="amount" style={{color: '#FF9800'}}>{parseFloat(duesData.summary.totalCustomerDues || 0).toFixed(2)}</p>
          <span className="meta">From {duesData.summary.customerCount} customers</span>
        </div>
        <div className="summary-card">
          <h3>Vendor Payables</h3>
          <p className="amount" style={{color: '#F44336'}}>{parseFloat(duesData.summary.totalVendorDues || 0).toFixed(2)}</p>
          <span className="meta">To {duesData.summary.vendorCount} vendors</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Type</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All (Customers & Vendors)</option>
            <option value="customer">Customers Only</option>
            <option value="vendor">Vendors Only</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Search Entity</label>
          <input
            type="text"
            placeholder="Search entity name..."
            value={filters.searchTerm}
            onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <label>Due Status</label>
          <select
            value={filters.dueStatus}
            onChange={(e) => setFilters({ ...filters, dueStatus: e.target.value })}
            className="filter-select"
          >
            <option value="">All Due Status</option>
            <option value="pending">Pending (All)</option>
            <option value="overdue">High Outstanding (&gt;10,000)</option>
          </select>
        </div>
      </div>

      {/* Dues Table */}
      <div className="dues-table-container">
        <h2>{filterType === 'customer' ? 'Customer Receivables' : filterType === 'vendor' ? 'Vendor Payables' : 'All Outstanding Dues'}</h2>
        {dues.length === 0 ? (
          <div className="no-dues">
            <p>No outstanding dues found</p>
          </div>
        ) : (
          <div className="dues-table-wrapper">
            <table className="dues-table">
              <thead>
                <tr>
                  <th>Entity Name</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Total Due</th>
                  <th>Amount Paid</th>
                  <th>Pending</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dues.map((due, idx) => (
                  <tr key={idx} className="due-row">
                    <td className="entity-name">
                      <strong>{due.name}</strong>
                    </td>
                    <td>
                      <span className={`badge badge-${due.type}`}>
                        {due.type === 'customer' ? 'Customer' : 'Vendor'}
                      </span>
                    </td>
                    <td>
                      <div className="contact-info">
                        <div>{due.email || 'N/A'}</div>
                        <div>{due.phone || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="amount">{parseFloat(due.totalDue || due.pending).toFixed(2)}</td>
                    <td className="amount paid">{parseFloat(due.paid || 0).toFixed(2)}</td>
                    <td className="amount pending">{parseFloat(due.pending).toFixed(2)}</td>
                    <td>
                      <div className="status-indicator" style={{backgroundColor: getStatusColor(due.pending)}}></div>
                      <span className={`status ${due.pending > 20000 ? 'critical' : due.pending > 10000 ? 'warning' : 'normal'}`}>
                        {due.pending > 20000 ? 'Critical' : due.pending > 10000 ? 'Warning' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary Footer */}
            <div className="table-footer">
              <div className="footer-stats">
                <div>
                  <strong>Total Pending:</strong>
                  <span className="total-amount">{dues.reduce((sum, d) => sum + parseFloat(d.pending), 0).toFixed(2)}</span>
                </div>
                <div>
                  <strong>Total Paid:</strong>
                  <span className="paid-amount">{dues.reduce((sum, d) => sum + parseFloat(d.paid || 0), 0).toFixed(2)}</span>
                </div>
                <div>
                  <strong>Number of Entities:</strong>
                  <span>{dues.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Breakdown by Type */}
      {filterType === 'all' && (
        <div className="breakdown-section">
          <div className="breakdown-cards">
            <div className="breakdown-card customers">
              <h3>Top 5 Customer Debtors</h3>
              {duesData.customerDues.sort((a, b) => b.pending - a.pending).slice(0, 5).map((customer, idx) => (
                <div key={idx} className="breakdown-item">
                  <div className="item-name">{customer.name}</div>
                  <div className="item-amount">{parseFloat(customer.pending).toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div className="breakdown-card vendors">
              <h3>Top 5 Vendor Creditors</h3>
              {duesData.vendorDues.sort((a, b) => b.pending - a.pending).slice(0, 5).map((vendor, idx) => (
                <div key={idx} className="breakdown-item">
                  <div className="item-name">{vendor.name}</div>
                  <div className="item-amount">{parseFloat(vendor.pending).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DuesReport;
