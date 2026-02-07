import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { reportAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToaster } from '../context/ToasterContext';
import { AuthContext } from '../context/AuthContext';

const REPORT_CONFIG = {
  'profit-loss': { title: 'Profit & Loss', requiresDateRange: true },
  'balance-sheet': { title: 'Balance Sheet', requiresDateRange: false },
  sales: { title: 'Sales Report', requiresDateRange: true },
  gst: { title: 'GST Report', requiresDateRange: true },
  customers: { title: 'Customer Report', requiresDateRange: true },
  vendors: { title: 'Vendor Report', requiresDateRange: true },
  inventory: { title: 'Inventory Report', requiresDateRange: false },
};

const formatDate = (date) => {
  if (!date) return '';
  return date.toISOString().split('T')[0];
};

const ReportDetailScreen = ({ route }) => {
  const { reportType = 'profit-loss' } = route.params || {};
  const { showToast } = useToaster();
  const { user } = useContext(AuthContext);
  const config = REPORT_CONFIG[reportType] || REPORT_CONFIG['profit-loss'];

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDate, setShowStartDate] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [expandedVendor, setExpandedVendor] = useState(null);

  const companyInfo = {
    name: user?.business_name || user?.name || 'Sanchalak Business Solutions',
    address: user?.address || 'Business Address',
    city: user?.city || 'City, State',
    phone: user?.phone ? `Phone: ${user.phone}` : 'Phone: N/A',
    email: user?.email ? `Email: ${user.email}` : 'Email: N/A',
    gstin: user?.gstin ? `GSTIN: ${user.gstin}` : 'GSTIN: N/A',
  };

  const formatCurrency = (value) => {
    const amount = parseFloat(value || 0);
    if (Number.isNaN(amount)) return '₹0.00';
    return `₹${amount.toFixed(2)}`;
  };

  const escapeHtml = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');


  const buildPDFHtml = () => {
    const title = config.title;
    const period = config.requiresDateRange ? `${formatDate(startDate)} to ${formatDate(endDate)}` : '';
    const generatedOn = new Date().toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const headerHtml = `
      <div class="header">
        <div class="brand">
          <div class="logo">${escapeHtml(companyInfo.name.split(' ')[0] || 'SB')}</div>
          <div class="company">
            <div class="company-name">${escapeHtml(companyInfo.name)}</div>
            <div class="company-meta">${escapeHtml(companyInfo.address)}, ${escapeHtml(companyInfo.city)}</div>
            <div class="company-meta">${escapeHtml(companyInfo.phone)} | ${escapeHtml(companyInfo.email)}</div>
            <div class="company-meta">${escapeHtml(companyInfo.gstin)}</div>
          </div>
        </div>
        <div class="report">
          <div class="report-title">${escapeHtml(title)}</div>
          ${period ? `<div class="report-period">Period: ${escapeHtml(period)}</div>` : ''}
          <div class="report-period">Generated: ${escapeHtml(generatedOn)}</div>
        </div>
      </div>
    `;

    const baseStyles = `
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #1a202c; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
        .brand { display: flex; gap: 16px; align-items: center; }
        .logo { width: 42px; height: 42px; border-radius: 21px; background: #667eea; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
        .company-name { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
        .company-meta { font-size: 11px; color: #4a5568; }
        .report-title { font-size: 18px; font-weight: 700; text-align: right; }
        .report-period { font-size: 11px; color: #4a5568; text-align: right; margin-top: 2px; }
        h2 { margin: 0 0 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; text-align: left; }
        th { background: #f7fafc; text-transform: capitalize; }
        .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 16px 0; }
        .summary-card { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
        .summary-label { font-size: 11px; color: #4a5568; }
        .summary-value { font-size: 14px; font-weight: 700; margin-top: 6px; }
        .section-title { font-size: 14px; font-weight: 700; margin: 16px 0 6px; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 12px; }
        .row strong { font-weight: 700; }
      </style>
    `;

    if (reportType === 'profit-loss') {
      return `
        <html>
          <head>${baseStyles}</head>
          <body>
            ${headerHtml}
            <div class="summary-grid">
              <div class="summary-card"><div class="summary-label">Total Revenue</div><div class="summary-value">${formatCurrency(reportData?.revenue?.totalRevenue)}</div></div>
              <div class="summary-card"><div class="summary-label">Collected Revenue</div><div class="summary-value">${formatCurrency(reportData?.revenue?.collectedRevenue)}</div></div>
              <div class="summary-card"><div class="summary-label">Gross Profit</div><div class="summary-value">${formatCurrency(reportData?.grossProfit)}</div></div>
              <div class="summary-card"><div class="summary-label">GST Collected</div><div class="summary-value">${formatCurrency(reportData?.gstCollected)}</div></div>
            </div>
            <div class="section-title">Profit & Loss Summary</div>
            <div class="row"><span>Total Revenue</span><strong>${formatCurrency(reportData?.revenue?.totalRevenue)}</strong></div>
            <div class="row"><span>Collected Revenue</span><strong>${formatCurrency(reportData?.revenue?.collectedRevenue)}</strong></div>
            <div class="row"><span>Cost of Goods Sold</span><strong>${formatCurrency(reportData?.costOfGoodsSold)}</strong></div>
            <div class="row"><span>Gross Profit</span><strong>${formatCurrency(reportData?.grossProfit)}</strong></div>
            <div class="row"><span>Gross Profit Margin</span><strong>${reportData?.grossProfitMargin || 0}%</strong></div>
            <div class="row"><span>GST Collected</span><strong>${formatCurrency(reportData?.gstCollected)}</strong></div>
          </body>
        </html>
      `;
    }

    if (reportType === 'balance-sheet') {
      return `
        <html>
          <head>${baseStyles}</head>
          <body>
            ${headerHtml}
            <div class="section-title">Assets</div>
            <table>
              <tr><td>Cash</td><td>${formatCurrency(reportData?.assets?.cash)}</td></tr>
              <tr><td>Accounts Receivable</td><td>${formatCurrency(reportData?.assets?.accountsReceivable)}</td></tr>
              <tr><td>Customer Debit/Credit Balance</td><td>${formatCurrency(reportData?.assets?.customerDebitCreditBalance)}</td></tr>
              <tr><td>Total Accounts Receivable</td><td>${formatCurrency(reportData?.assets?.totalAccountsReceivable)}</td></tr>
              <tr><td>Inventory</td><td>${formatCurrency(reportData?.assets?.inventory)}</td></tr>
              <tr><td>Total Assets</td><td>${formatCurrency(reportData?.assets?.totalAssets)}</td></tr>
            </table>
            <div class="section-title">Liabilities</div>
            <table>
              <tr><td>Accounts Payable</td><td>${formatCurrency(reportData?.liabilities?.accountsPayable)}</td></tr>
              <tr><td>Vendor Debit/Credit Balance</td><td>${formatCurrency(reportData?.liabilities?.vendorDebitCreditBalance)}</td></tr>
              <tr><td>Total Accounts Payable</td><td>${formatCurrency(reportData?.liabilities?.totalAccountsPayable)}</td></tr>
              <tr><td>Total Liabilities</td><td>${formatCurrency(reportData?.liabilities?.totalLiabilities)}</td></tr>
            </table>
            <div class="section-title">Equity</div>
            <table>
              <tr><td>Total Equity</td><td>${formatCurrency(reportData?.equity)}</td></tr>
            </table>
          </body>
        </html>
      `;
    }

    if (reportType === 'sales' && Array.isArray(reportData) && reportData.length > 0) {
      const totalOrders = reportData.reduce((sum, row) => sum + (parseInt(row.orders) || 0), 0);
      const totalItems = reportData.reduce((sum, row) => sum + (parseInt(row.items_sold) || 0), 0);
      const totalRevenue = reportData.reduce((sum, row) => sum + (parseFloat(row.daily_revenue) || 0), 0);

      const salesHtml = `
        <div class="summary-grid">
          <div class="summary-card"><div class="summary-label">Total Orders</div><div class="summary-value">${totalOrders}</div></div>
          <div class="summary-card"><div class="summary-label">Items Sold</div><div class="summary-value">${totalItems}</div></div>
          <div class="summary-card"><div class="summary-label">Total Revenue</div><div class="summary-value">${formatCurrency(totalRevenue)}</div></div>
        </div>
        <div class="section-title">Daily Sales Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Orders</th>
              <th>Items Sold</th>
              <th>Revenue</th>
              <th>Quantity</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.map(row => `
              <tr>
                <td>${new Date(row.sale_date).toLocaleDateString()}</td>
                <td>${row.orders || 0}</td>
                <td>${row.items_sold || 0}</td>
                <td>${formatCurrency(row.daily_revenue)}</td>
                <td>${row.total_quantity || 0}</td>
                <td>${escapeHtml(row.category || 'N/A')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      return `
        <html>
          <head>${baseStyles}</head>
          <body>
            ${headerHtml}
            ${salesHtml}
          </body>
        </html>
      `;
    }

    if (reportType === 'gst' && reportData && typeof reportData === 'object' && !Array.isArray(reportData)) {
      const gstHtml = `
        <div class="summary-grid">
          <div class="summary-card"><div class="summary-label">Total GST</div><div class="summary-value">${formatCurrency(reportData.total_gst)}</div></div>
          <div class="summary-card"><div class="summary-label">Taxable Value</div><div class="summary-value">${formatCurrency(reportData.total_taxable)}</div></div>
        </div>
        <div class="section-title">GST Breakdown by Rate</div>
        <table>
          <thead>
            <tr>
              <th>GST Rate</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>0% GST</td><td style="text-align: right;">${formatCurrency(reportData.gst_0_percent)}</td></tr>
            <tr><td>5% GST</td><td style="text-align: right;">${formatCurrency(reportData.gst_5_percent)}</td></tr>
            <tr><td>12% GST</td><td style="text-align: right;">${formatCurrency(reportData.gst_12_percent)}</td></tr>
            <tr><td>18% GST</td><td style="text-align: right;">${formatCurrency(reportData.gst_18_percent)}</td></tr>
            <tr><td>28% GST</td><td style="text-align: right;">${formatCurrency(reportData.gst_28_percent)}</td></tr>
            <tr style="font-weight: 600; background: #f7fafc;">
              <td>Total GST</td>
              <td style="text-align: right;">${formatCurrency(reportData.total_gst)}</td>
            </tr>
            <tr style="font-weight: 600; background: #f7fafc;">
              <td>Total Taxable Value</td>
              <td style="text-align: right;">${formatCurrency(reportData.total_taxable)}</td>
            </tr>
          </tbody>
        </table>
      `;

      return `
        <html>
          <head>${baseStyles}</head>
          <body>
            ${headerHtml}
            ${gstHtml}
          </body>
        </html>
      `;
    }

    if (reportType === 'inventory' && Array.isArray(reportData) && reportData.length > 0) {
      const inventoryHtml = reportData.map(item => `
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <h4 style="margin: 0 0 8px 0; color: #1a202c;">${escapeHtml(item.name || item.product_name || 'N/A')}</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
            ${Object.entries(item).map(([key, value]) => {
              if (key === 'name' || key === 'product_name') return '';
              return `<div><strong>${key.replace(/_/g, ' ')}:</strong> ${escapeHtml(String(value || 'N/A'))}</div>`;
            }).join('')}
          </div>
        </div>
      `).join('');

      return `
        <html>
          <head>${baseStyles}</head>
          <body>
            ${headerHtml}
            <div class="section-title">Inventory Items</div>
            ${inventoryHtml}
          </body>
        </html>
      `;
    }

    if (reportType === 'customers' && Array.isArray(reportData) && reportData.length > 0) {
      const customersHtml = reportData.map(customer => {
        let customerHtml = `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; page-break-inside: avoid;">
            <h3 style="margin: 0 0 12px 0; color: #1a202c;">${escapeHtml(customer.name)}</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; font-size: 12px;">
              <div><strong>Email:</strong> ${escapeHtml(customer.email || 'N/A')}</div>
              <div><strong>Orders:</strong> ${customer.total_orders || 0}</div>
              <div><strong>Total Spent:</strong> ${formatCurrency(customer.total_spent)}</div>
              <div><strong>Paid:</strong> ${formatCurrency(customer.paid_amount)}</div>
              <div><strong>Due:</strong> ${formatCurrency(customer.due_amount)}</div>
              <div><strong>Balance:</strong> ${formatCurrency(customer.debit_credit_balance)}</div>
            </div>
        `;

        // Add payment history
        if (customer.payment_history && customer.payment_history.length > 0) {
          customerHtml += `
            <div style="margin-top: 16px;">
              <h4 style="margin: 8px 0; color: #34C759; font-size: 13px;">💰 Payments Received</h4>
              <table style="width: 100%; font-size: 11px; margin-bottom: 8px;">
                <thead>
                  <tr style="background: #f7fafc;">
                    <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">Date</th>
                    <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">Invoice</th>
                    <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: right;">Amount</th>
                    <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">Method</th>
                    <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">Notes</th>
                  </tr>
                </thead>
                <tbody>
          `;
          
          customer.payment_history.forEach(payment => {
            customerHtml += `
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 6px;">${new Date(payment.payment_date).toLocaleDateString()}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px;">${escapeHtml(payment.invoice_number || 'N/A')}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: right; font-weight: 600;">${formatCurrency(payment.amount)}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px;">${escapeHtml(payment.payment_method || 'N/A')}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px;">${escapeHtml(payment.notes || '-')}</td>
              </tr>
            `;
          });
          
          const totalPayments = customer.payment_history.reduce((sum, p) => sum + parseFloat(p.amount), 0);
          customerHtml += `
                  <tr style="font-weight: 600; background: #f7fafc;">
                    <td colspan="2" style="border: 1px solid #e2e8f0; padding: 6px;">Total Payments</td>
                    <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: right;">${formatCurrency(totalPayments)}</td>
                    <td colspan="2" style="border: 1px solid #e2e8f0; padding: 6px;"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          `;
        }

        // Add debit notes
        if (customer.debit_notes && customer.debit_notes.length > 0) {
          customerHtml += `
            <div style="margin-top: 16px;">
              <h4 style="margin: 8px 0; color: #FF3B30; font-size: 13px;">📋 Debit Notes (Customer owes more)</h4>
              <table style="width: 100%; font-size: 11px; margin-bottom: 8px;">
                <thead>
                  <tr style="background: #f7fafc;">
                    <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">Date</th>
                    <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">Note #</th>
                    <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: right;">Amount</th>
                    <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">Reason</th>
                    <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">Status</th>
                  </tr>
                </thead>
                <tbody>
          `;
          
          customer.debit_notes.forEach(note => {
            customerHtml += `
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 6px;">${new Date(note.note_date).toLocaleDateString()}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px;">${escapeHtml(note.debit_note_number)}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: right; color: #FF3B30; font-weight: 600;">+${formatCurrency(note.amount)}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px;">${escapeHtml(note.reason)}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${escapeHtml(note.status)}</td>
              </tr>
            `;
          });
          
          const totalDebit = customer.debit_notes.reduce((sum, n) => sum + parseFloat(n.amount), 0);
          customerHtml += `
                  <tr style="font-weight: 600; background: #f7fafc;">
                    <td colspan="2" style="border: 1px solid #e2e8f0; padding: 6px;">Total Debit Notes</td>
                    <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: right; color: #FF3B30;">+${formatCurrency(totalDebit)}</td>
                    <td colspan="2" style="border: 1px solid #e2e8f0; padding: 6px;"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          `;
        }

        // Add credit notes
        if (customer.credit_notes && customer.credit_notes.length > 0) {
          customerHtml += `
            <div style="margin-top: 16px;">
              <h4 style="margin: 8px 0; color: #007AFF; font-size: 13px;">📄 Credit Notes (Customer owes less)</h4>
              <table style="width: 100%; font-size: 11px; margin-bottom: 8px;">
                <thead>
                  <tr style="background: #f7fafc;">
                    <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">Date</th>
                    <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">Note #</th>
                    <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: right;">Amount</th>
                    <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">Reason</th>
                    <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">Status</th>
                  </tr>
                </thead>
                <tbody>
          `;
          
          customer.credit_notes.forEach(note => {
            customerHtml += `
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 6px;">${new Date(note.note_date).toLocaleDateString()}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px;">${escapeHtml(note.credit_note_number)}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: right; color: #007AFF; font-weight: 600;">-${formatCurrency(note.amount)}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px;">${escapeHtml(note.reason)}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center;">${escapeHtml(note.status)}</td>
              </tr>
            `;
          });
          
          const totalCredit = customer.credit_notes.reduce((sum, n) => sum + parseFloat(n.amount), 0);
          customerHtml += `
                  <tr style="font-weight: 600; background: #f7fafc;">
                    <td colspan="2" style="border: 1px solid #e2e8f0; padding: 6px;">Total Credit Notes</td>
                    <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: right; color: #007AFF;">-${formatCurrency(totalCredit)}</td>
                    <td colspan="2" style="border: 1px solid #e2e8f0; padding: 6px;"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          `;
        }

        customerHtml += '</div>';
        return customerHtml;
      }).join('');

      return `
        <html>
          <head>${baseStyles}</head>
          <body>
            ${headerHtml}
            ${customersHtml}
          </body>
        </html>
      `;
    }

    if (reportType === 'vendors' && Array.isArray(reportData) && reportData.length > 0) {
      const vendorsHtml = reportData.map(vendor => {
        let vendorHtml = `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; page-break-inside: avoid;">
            <h3 style="margin: 0 0 12px 0; color: #1a202c;">${escapeHtml(vendor.name)}</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; font-size: 12px;">
              <div><strong>Email:</strong> ${escapeHtml(vendor.email || 'N/A')}</div>
              <div><strong>Phone:</strong> ${escapeHtml(vendor.phone || 'N/A')}</div>
              <div><strong>Orders:</strong> ${vendor.total_orders || 0}</div>
              <div><strong>Total Purchased:</strong> ${formatCurrency(vendor.total_purchased)}</div>
              <div><strong>Paid:</strong> ${formatCurrency(vendor.paid_amount)}</div>
              <div><strong>Due:</strong> ${formatCurrency(vendor.due_amount)}</div>
            </div>
        `;

        // Add payment history
        if (vendor.payment_history && vendor.payment_history.length > 0) {
          vendorHtml += `
            <div style="margin-top: 16px;">
              <h4 style="margin: 8px 0; color: #34C759; font-size: 13px;">💰 Payments Made</h4>
              <table style="width: 100%; font-size: 11px; margin-bottom: 8px;">
                <thead>
                  <tr style="background: #f7fafc;">
                    <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">Date</th>
                    <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">PO Number</th>
                    <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: right;">Amount</th>
                    <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">Method</th>
                    <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">Notes</th>
                  </tr>
                </thead>
                <tbody>
          `;
          
          vendor.payment_history.forEach(payment => {
            vendorHtml += `
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 6px;">${new Date(payment.payment_date).toLocaleDateString()}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px;">${escapeHtml(payment.po_number || 'N/A')}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: right; color: #34C759; font-weight: 600;">${formatCurrency(payment.amount)}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px;">${escapeHtml(payment.payment_method || 'N/A')}</td>
                <td style="border: 1px solid #e2e8f0; padding: 6px;">${escapeHtml(payment.notes || '-')}</td>
              </tr>
            `;
          });
          
          const totalPayments = vendor.payment_history.reduce((sum, p) => sum + parseFloat(p.amount), 0);
          vendorHtml += `
                  <tr style="font-weight: 600; background: #f7fafc;">
                    <td colspan="2" style="border: 1px solid #e2e8f0; padding: 6px;">Total Payments</td>
                    <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: right; color: #34C759;">${formatCurrency(totalPayments)}</td>
                    <td colspan="2" style="border: 1px solid #e2e8f0; padding: 6px;"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          `;
        }

        vendorHtml += '</div>';
        return vendorHtml;
      }).join('');

      return `
        <html>
          <head>${baseStyles}</head>
          <body>
            ${headerHtml}
            ${vendorsHtml}
          </body>
        </html>
      `;
    }

    if (Array.isArray(reportData) && reportData.length > 0) {
      const headers = Object.keys(reportData[0]);
      const headerRow = headers.map((h) => `<th style="border:1px solid #ddd; padding:8px;">${h}</th>`).join('');
      const rows = reportData
        .map(
          (row) =>
            `<tr>${headers
              .map((h) => `<td style="border:1px solid #ddd; padding:8px;">${row[h] ?? ''}</td>`)
              .join('')}</tr>`
        )
        .join('');
      return `
        <html>
          <head>${baseStyles}</head>
          <body>
            ${headerHtml}
            <table>
              <thead><tr>${headerRow}</tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </body>
        </html>
      `;
    }

    return `
      <html>
        <head>${baseStyles}</head>
        <body>
          ${headerHtml}
          <p>No data available</p>
        </body>
      </html>
    `;
  };

  const handleExportPDF = async () => {
    if (!reportData) {
      showToast('Generate a report first', 'error');
      return;
    }
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        showToast('Sharing is not available on this device', 'error');
        return;
      }
      const html = buildPDFHtml();
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch (error) {
      console.error('PDF export error:', error);
      showToast('Failed to export PDF', 'error');
    }
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      let data;
      switch (reportType) {
        case 'profit-loss':
          data = await reportAPI.getProfitLoss(formatDate(startDate), formatDate(endDate));
          break;
        case 'balance-sheet':
          data = await reportAPI.getBalanceSheet();
          break;
        case 'sales':
          data = await reportAPI.getSalesReport(formatDate(startDate), formatDate(endDate));
          break;
        case 'gst':
          data = await reportAPI.getGSTReport(formatDate(startDate), formatDate(endDate));
          break;
        case 'customers':
          data = await reportAPI.getCustomerReport(formatDate(startDate), formatDate(endDate));
          break;
        case 'vendors':
          data = await reportAPI.getVendorReport(formatDate(startDate), formatDate(endDate));
          break;
        case 'inventory':
          data = await reportAPI.getInventoryReport();
          break;
        default:
          data = null;
      }
      setReportData(data || null);
    } catch (error) {
      console.error('Report error:', error);
      showToast('Failed to generate report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderKeyValueRow = (label, value, isHighlight = false) => (
    <View style={[styles.row, isHighlight && styles.highlightRow]}>
      <Text style={[styles.rowLabel, isHighlight && styles.highlightText]}>{label}</Text>
      <Text style={[styles.rowValue, isHighlight && styles.highlightText]}>{value}</Text>
    </View>
  );

  const renderProfitLoss = () => (
    <View>
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: '#34C759' }]}> 
          <Text style={styles.summaryLabel}>Total Revenue</Text>
          <Text style={styles.summaryValue}>₹{reportData?.revenue?.totalRevenue?.toFixed?.(2) || '0.00'}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#007AFF' }]}> 
          <Text style={styles.summaryLabel}>Collected Revenue</Text>
          <Text style={styles.summaryValue}>₹{reportData?.revenue?.collectedRevenue?.toFixed?.(2) || '0.00'}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#FF9500' }]}> 
          <Text style={styles.summaryLabel}>Gross Profit</Text>
          <Text style={styles.summaryValue}>₹{reportData?.grossProfit?.toFixed?.(2) || '0.00'}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#5856D6' }]}> 
          <Text style={styles.summaryLabel}>GST Collected</Text>
          <Text style={styles.summaryValue}>₹{reportData?.gstCollected?.toFixed?.(2) || '0.00'}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        {renderKeyValueRow('Total Revenue', `₹${reportData?.revenue?.totalRevenue?.toFixed?.(2) || '0.00'}`)}
        {renderKeyValueRow('Collected Revenue', `₹${reportData?.revenue?.collectedRevenue?.toFixed?.(2) || '0.00'}`)}
        {renderKeyValueRow('Cost of Goods Sold', `₹${reportData?.costOfGoodsSold?.toFixed?.(2) || '0.00'}`)}
        {renderKeyValueRow('Gross Profit', `₹${reportData?.grossProfit?.toFixed?.(2) || '0.00'}`, true)}
        {renderKeyValueRow('Gross Profit Margin', `${reportData?.grossProfitMargin || 0}%`)}
        {renderKeyValueRow('GST Collected', `₹${reportData?.gstCollected?.toFixed?.(2) || '0.00'}`)}
      </View>
    </View>
  );

  const renderBalanceSheet = () => (
    <View>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Assets</Text>
        {renderKeyValueRow('Cash', `₹${reportData?.assets?.cash?.toFixed?.(2) || '0.00'}`)}
        {renderKeyValueRow('Accounts Receivable', `₹${reportData?.assets?.accountsReceivable?.toFixed?.(2) || '0.00'}`)}
        {renderKeyValueRow('Customer Debit/Credit Balance', `₹${parseFloat(reportData?.assets?.customerDebitCreditBalance || 0).toFixed(2)}`)}
        {renderKeyValueRow('Total Accounts Receivable', `₹${reportData?.assets?.totalAccountsReceivable?.toFixed?.(2) || '0.00'}`, true)}
        {renderKeyValueRow('Inventory', `₹${reportData?.assets?.inventory?.toFixed?.(2) || '0.00'}`)}
        {renderKeyValueRow('Total Assets', `₹${reportData?.assets?.totalAssets?.toFixed?.(2) || '0.00'}`, true)}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Liabilities</Text>
        {renderKeyValueRow('Accounts Payable', `₹${reportData?.liabilities?.accountsPayable?.toFixed?.(2) || '0.00'}`)}
        {renderKeyValueRow('Vendor Debit/Credit Balance', `₹${parseFloat(reportData?.liabilities?.vendorDebitCreditBalance || 0).toFixed(2)}`)}
        {renderKeyValueRow('Total Accounts Payable', `₹${reportData?.liabilities?.totalAccountsPayable?.toFixed?.(2) || '0.00'}`, true)}
        {renderKeyValueRow('Total Liabilities', `₹${reportData?.liabilities?.totalLiabilities?.toFixed?.(2) || '0.00'}`, true)}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Equity</Text>
        {renderKeyValueRow('Total Equity', `₹${reportData?.equity?.toFixed?.(2) || '0.00'}`, true)}
      </View>
    </View>
  );

  const formatValue = (value) => {
    if (Array.isArray(value)) {
      return value.length ? value.map((item) => formatValue(item)).join(', ') : '-';
    }
    if (value && typeof value === 'object') {
      return JSON.stringify(value);
    }
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    return String(value);
  };

  const renderSalesReport = () => {
    if (!Array.isArray(reportData) || reportData.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="information-circle-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No sales data available</Text>
        </View>
      );
    }

    const totalOrders = reportData.reduce((sum, row) => sum + (parseInt(row.orders) || 0), 0);
    const totalItems = reportData.reduce((sum, row) => sum + (parseInt(row.items_sold) || 0), 0);
    const totalRevenue = reportData.reduce((sum, row) => sum + (parseFloat(row.daily_revenue) || 0), 0);

    return (
      <View>
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: '#5856D6' }]}>
            <Text style={styles.summaryLabel}>Total Orders</Text>
            <Text style={styles.summaryValue}>{totalOrders}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#FF9500' }]}>
            <Text style={styles.summaryLabel}>Items Sold</Text>
            <Text style={styles.summaryValue}>{totalItems}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#34C759', flexBasis: '100%' }]}>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
            <Text style={styles.summaryValue}>₹{totalRevenue.toFixed(2)}</Text>
          </View>
        </View>

        {reportData.map((item, index) => (
          <View key={item.id || index} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{new Date(item.sale_date).toLocaleDateString()}</Text>
            {renderKeyValueRow('Orders', item.orders)}
            {renderKeyValueRow('Items Sold', item.items_sold)}
            {renderKeyValueRow('Revenue', `₹${parseFloat(item.daily_revenue).toFixed(2)}`)}
            {renderKeyValueRow('Quantity', item.total_quantity)}
            {renderKeyValueRow('Category', item.category || 'N/A')}
          </View>
        ))}
      </View>
    );
  };

  const renderGSTReport = () => {
    if (!reportData || typeof reportData !== 'object') {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="information-circle-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No GST data available</Text>
        </View>
      );
    }

    return (
      <View>
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: '#5856D6' }]}>
            <Text style={styles.summaryLabel}>Total GST</Text>
            <Text style={styles.summaryValue}>₹{parseFloat(reportData.total_gst || 0).toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#007AFF' }]}>
            <Text style={styles.summaryLabel}>Taxable Value</Text>
            <Text style={styles.summaryValue}>₹{parseFloat(reportData.total_taxable || 0).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>GST Breakdown</Text>
          {renderKeyValueRow('0% GST', `₹${parseFloat(reportData.gst_0_percent || 0).toFixed(2)}`)}
          {renderKeyValueRow('5% GST', `₹${parseFloat(reportData.gst_5_percent || 0).toFixed(2)}`)}
          {renderKeyValueRow('12% GST', `₹${parseFloat(reportData.gst_12_percent || 0).toFixed(2)}`)}
          {renderKeyValueRow('18% GST', `₹${parseFloat(reportData.gst_18_percent || 0).toFixed(2)}`)}
          {renderKeyValueRow('28% GST', `₹${parseFloat(reportData.gst_28_percent || 0).toFixed(2)}`)}
          {renderKeyValueRow('Total GST', `₹${parseFloat(reportData.total_gst || 0).toFixed(2)}`, true)}
          {renderKeyValueRow('Total Taxable', `₹${parseFloat(reportData.total_taxable || 0).toFixed(2)}`, true)}
        </View>
      </View>
    );
  };

  const renderCustomerReport = () => {
    if (!Array.isArray(reportData) || reportData.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="information-circle-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No customer data available</Text>
        </View>
      );
    }

    const totalSpent = reportData.reduce((sum, c) => sum + (parseFloat(c.total_spent) || 0), 0);
    const totalPaid = reportData.reduce((sum, c) => sum + (parseFloat(c.paid_amount) || 0), 0);
    const totalDue = reportData.reduce((sum, c) => sum + (parseFloat(c.due_amount) || 0), 0);

    return (
      <View>
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: '#5856D6' }]}>
            <Text style={styles.summaryLabel}>Total Customers</Text>
            <Text style={styles.summaryValue}>{reportData.length}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#007AFF' }]}>
            <Text style={styles.summaryLabel}>Total Spent</Text>
            <Text style={styles.summaryValue}>₹{totalSpent.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#34C759' }]}>
            <Text style={styles.summaryLabel}>Total Paid</Text>
            <Text style={styles.summaryValue}>₹{totalPaid.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#FF3B30' }]}>
            <Text style={styles.summaryLabel}>Total Due</Text>
            <Text style={styles.summaryValue}>₹{totalDue.toFixed(2)}</Text>
          </View>
        </View>

        {reportData.map((customer) => (
          <View key={customer.id} style={styles.sectionCard}>
            <TouchableOpacity
              onPress={() => setExpandedCustomer(expandedCustomer === customer.id ? null : customer.id)}
              style={styles.expandableHeader}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{customer.name}</Text>
                <Text style={styles.customerEmail}>{customer.email}</Text>
              </View>
              <Ionicons
                name={expandedCustomer === customer.id ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#007AFF"
              />
            </TouchableOpacity>

            <View style={styles.customerStats}>
              {renderKeyValueRow('Orders', customer.total_orders)}
              {renderKeyValueRow('Total Spent', `₹${parseFloat(customer.total_spent).toFixed(2)}`)}
              {renderKeyValueRow('Paid', `₹${parseFloat(customer.paid_amount).toFixed(2)}`)}
              {renderKeyValueRow('Due', `₹${parseFloat(customer.due_amount).toFixed(2)}`)}
            </View>

            {expandedCustomer === customer.id && (
              <View style={styles.expandedSection}>
                {customer.payment_history && customer.payment_history.length > 0 && (
                  <View style={styles.transactionSection}>
                    <Text style={[styles.transactionTitle, { color: '#34C759' }]}>💰 Payments Received</Text>
                    {customer.payment_history.map((payment) => (
                      <View key={`payment-${payment.id}`} style={styles.transactionItem}>
                        <Text style={styles.transactionDate}>
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </Text>
                        <Text style={styles.transactionLabel}>Invoice: {payment.invoice_number || 'N/A'}</Text>
                        <Text style={[styles.transactionAmount, { color: '#34C759' }]}>
                          ₹{parseFloat(payment.amount).toFixed(2)}
                        </Text>
                        <Text style={styles.transactionMeta}>{payment.payment_method}</Text>
                        {payment.notes && <Text style={styles.transactionNotes}>{payment.notes}</Text>}
                      </View>
                    ))}
                    <View style={styles.transactionTotal}>
                      <Text style={styles.transactionTotalLabel}>Total Payments:</Text>
                      <Text style={[styles.transactionTotalValue, { color: '#34C759' }]}>
                        ₹{customer.payment_history.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}

                {customer.debit_notes && customer.debit_notes.length > 0 && (
                  <View style={styles.transactionSection}>
                    <Text style={[styles.transactionTitle, { color: '#FF3B30' }]}>
                      📋 Debit Notes{' '}
                      <Text style={styles.transactionSubtitle}>(Customer owes more)</Text>
                    </Text>
                    {customer.debit_notes.map((note) => (
                      <View key={`debit-${note.id}`} style={styles.transactionItem}>
                        <Text style={styles.transactionDate}>
                          {new Date(note.note_date).toLocaleDateString()}
                        </Text>
                        <Text style={styles.transactionLabel}>{note.debit_note_number}</Text>
                        <Text style={[styles.transactionAmount, { color: '#FF3B30' }]}>
                          +₹{parseFloat(note.amount).toFixed(2)}
                        </Text>
                        <Text style={styles.transactionMeta}>{note.reason}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: note.status === 'approved' ? '#E8F5E9' : note.status === 'cancelled' ? '#FFEBEE' : '#FFF3E0' }]}>
                          <Text style={[styles.statusText, { color: note.status === 'approved' ? '#2E7D32' : note.status === 'cancelled' ? '#C62828' : '#F57C00' }]}>
                            {note.status}
                          </Text>
                        </View>
                      </View>
                    ))}
                    <View style={styles.transactionTotal}>
                      <Text style={styles.transactionTotalLabel}>Total Debit Notes:</Text>
                      <Text style={[styles.transactionTotalValue, { color: '#FF3B30' }]}>
                        +₹{customer.debit_notes.reduce((sum, n) => sum + parseFloat(n.amount), 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}

                {customer.credit_notes && customer.credit_notes.length > 0 && (
                  <View style={styles.transactionSection}>
                    <Text style={[styles.transactionTitle, { color: '#007AFF' }]}>
                      📄 Credit Notes{' '}
                      <Text style={styles.transactionSubtitle}>(Customer owes less)</Text>
                    </Text>
                    {customer.credit_notes.map((note) => (
                      <View key={`credit-${note.id}`} style={styles.transactionItem}>
                        <Text style={styles.transactionDate}>
                          {new Date(note.note_date).toLocaleDateString()}
                        </Text>
                        <Text style={styles.transactionLabel}>{note.credit_note_number}</Text>
                        <Text style={[styles.transactionAmount, { color: '#007AFF' }]}>
                          -₹{parseFloat(note.amount).toFixed(2)}
                        </Text>
                        <Text style={styles.transactionMeta}>{note.reason}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: note.status === 'approved' ? '#E3F2FD' : note.status === 'cancelled' ? '#FFEBEE' : '#FFF3E0' }]}>
                          <Text style={[styles.statusText, { color: note.status === 'approved' ? '#1565C0' : note.status === 'cancelled' ? '#C62828' : '#F57C00' }]}>
                            {note.status}
                          </Text>
                        </View>
                      </View>
                    ))}
                    <View style={styles.transactionTotal}>
                      <Text style={styles.transactionTotalLabel}>Total Credit Notes:</Text>
                      <Text style={[styles.transactionTotalValue, { color: '#007AFF' }]}>
                        -₹{customer.credit_notes.reduce((sum, n) => sum + parseFloat(n.amount), 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}

                {(customer.payment_history?.length > 0 || customer.debit_notes?.length > 0 || customer.credit_notes?.length > 0) && (
                  <View style={styles.netBalanceCard}>
                    <Text style={styles.netBalanceTitle}>💼 Net Balance</Text>
                    <Text style={[styles.netBalanceAmount, { color: parseFloat(customer.debit_credit_balance || 0) > 0 ? '#FF3B30' : '#34C759' }]}>
                      {parseFloat(customer.debit_credit_balance || 0) > 0 ? '+' : ''}₹{parseFloat(customer.debit_credit_balance || 0).toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderVendorReport = () => {
    if (!Array.isArray(reportData) || reportData.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="information-circle-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No vendor data available</Text>
        </View>
      );
    }

    const totalPurchased = reportData.reduce((sum, v) => sum + (parseFloat(v.total_purchased) || 0), 0);
    const totalPaid = reportData.reduce((sum, v) => sum + (parseFloat(v.paid_amount) || 0), 0);
    const totalDue = reportData.reduce((sum, v) => sum + (parseFloat(v.due_amount) || 0), 0);

    return (
      <View>
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: '#5856D6' }]}>
            <Text style={styles.summaryLabel}>Total Vendors</Text>
            <Text style={styles.summaryValue}>{reportData.length}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#007AFF' }]}>
            <Text style={styles.summaryLabel}>Total Purchased</Text>
            <Text style={styles.summaryValue}>₹{totalPurchased.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#34C759' }]}>
            <Text style={styles.summaryLabel}>Total Paid</Text>
            <Text style={styles.summaryValue}>₹{totalPaid.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#FF3B30' }]}>
            <Text style={styles.summaryLabel}>Total Due</Text>
            <Text style={styles.summaryValue}>₹{totalDue.toFixed(2)}</Text>
          </View>
        </View>

        {reportData.map((vendor) => (
          <View key={vendor.id} style={styles.sectionCard}>
            <TouchableOpacity
              onPress={() => setExpandedVendor(expandedVendor === vendor.id ? null : vendor.id)}
              style={styles.expandableHeader}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{vendor.name}</Text>
                <Text style={styles.customerEmail}>{vendor.email}</Text>
              </View>
              <Ionicons
                name={expandedVendor === vendor.id ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#007AFF"
              />
            </TouchableOpacity>

            <View style={styles.customerStats}>
              {renderKeyValueRow('Orders', vendor.total_orders)}
              {renderKeyValueRow('Total Purchased', `₹${parseFloat(vendor.total_purchased).toFixed(2)}`)}
              {renderKeyValueRow('Paid', `₹${parseFloat(vendor.paid_amount).toFixed(2)}`)}
              {renderKeyValueRow('Due', `₹${parseFloat(vendor.due_amount).toFixed(2)}`)}
            </View>

            {expandedVendor === vendor.id && (
              <View style={styles.expandedSection}>
                {vendor.payment_history && vendor.payment_history.length > 0 && (
                  <View style={styles.transactionSection}>
                    <Text style={[styles.transactionTitle, { color: '#34C759' }]}>💰 Payments Made</Text>
                    {vendor.payment_history.map((payment) => (
                      <View key={`payment-${payment.id}`} style={styles.transactionItem}>
                        <Text style={styles.transactionDate}>
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </Text>
                        <Text style={styles.transactionLabel}>PO: {payment.po_number || 'N/A'}</Text>
                        <Text style={[styles.transactionAmount, { color: '#34C759' }]}>
                          ₹{parseFloat(payment.amount).toFixed(2)}
                        </Text>
                        <Text style={styles.transactionMeta}>{payment.payment_method}</Text>
                        {payment.notes && <Text style={styles.transactionNotes}>{payment.notes}</Text>}
                      </View>
                    ))}
                    <View style={styles.transactionTotal}>
                      <Text style={styles.transactionTotalLabel}>Total Payments:</Text>
                      <Text style={[styles.transactionTotalValue, { color: '#34C759' }]}>
                        ₹{vendor.payment_history.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}

                {vendor.debit_notes && vendor.debit_notes.length > 0 && (
                  <View style={styles.transactionSection}>
                    <Text style={[styles.transactionTitle, { color: '#FF3B30' }]}>
                      📋 Debit Notes{' '}
                      <Text style={styles.transactionSubtitle}>(We owe less)</Text>
                    </Text>
                    {vendor.debit_notes.map((note) => (
                      <View key={`debit-${note.id}`} style={styles.transactionItem}>
                        <Text style={styles.transactionDate}>
                          {new Date(note.note_date).toLocaleDateString()}
                        </Text>
                        <Text style={styles.transactionLabel}>{note.debit_note_number}</Text>
                        <Text style={[styles.transactionAmount, { color: '#FF3B30' }]}>
                          -₹{parseFloat(note.amount).toFixed(2)}
                        </Text>
                        <Text style={styles.transactionMeta}>{note.reason}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: note.status === 'approved' ? '#E8F5E9' : note.status === 'cancelled' ? '#FFEBEE' : '#FFF3E0' }]}>
                          <Text style={[styles.statusText, { color: note.status === 'approved' ? '#2E7D32' : note.status === 'cancelled' ? '#C62828' : '#F57C00' }]}>
                            {note.status}
                          </Text>
                        </View>
                      </View>
                    ))}
                    <View style={styles.transactionTotal}>
                      <Text style={styles.transactionTotalLabel}>Total Debit Notes:</Text>
                      <Text style={[styles.transactionTotalValue, { color: '#FF3B30' }]}>
                        -₹{vendor.debit_notes.reduce((sum, n) => sum + parseFloat(n.amount), 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}

                {vendor.credit_notes && vendor.credit_notes.length > 0 && (
                  <View style={styles.transactionSection}>
                    <Text style={[styles.transactionTitle, { color: '#007AFF' }]}>
                      📝 Credit Notes{' '}
                      <Text style={styles.transactionSubtitle}>(We owe more)</Text>
                    </Text>
                    {vendor.credit_notes.map((note) => (
                      <View key={`credit-${note.id}`} style={styles.transactionItem}>
                        <Text style={styles.transactionDate}>
                          {new Date(note.note_date).toLocaleDateString()}
                        </Text>
                        <Text style={styles.transactionLabel}>{note.credit_note_number}</Text>
                        <Text style={[styles.transactionAmount, { color: '#007AFF' }]}>
                          +₹{parseFloat(note.amount).toFixed(2)}
                        </Text>
                        <Text style={styles.transactionMeta}>{note.reason}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: note.status === 'approved' ? '#E3F2FD' : note.status === 'cancelled' ? '#FFEBEE' : '#FFF3E0' }]}>
                          <Text style={[styles.statusText, { color: note.status === 'approved' ? '#1565C0' : note.status === 'cancelled' ? '#C62828' : '#F57C00' }]}>
                            {note.status}
                          </Text>
                        </View>
                      </View>
                    ))}
                    <View style={styles.transactionTotal}>
                      <Text style={styles.transactionTotalLabel}>Total Credit Notes:</Text>
                      <Text style={[styles.transactionTotalValue, { color: '#007AFF' }]}>
                        +₹{vendor.credit_notes.reduce((sum, n) => sum + parseFloat(n.amount), 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}

                {(vendor.payment_history?.length > 0 || vendor.debit_notes?.length > 0 || vendor.credit_notes?.length > 0) && (
                  <View style={styles.netBalanceCard}>
                    <Text style={styles.netBalanceTitle}>💼 Net Balance</Text>
                    <Text style={[styles.netBalanceAmount, { color: parseFloat(vendor.debit_credit_balance || 0) > 0 ? '#FF3B30' : '#34C759' }]}>
                      {parseFloat(vendor.debit_credit_balance || 0) > 0 ? '+' : ''}₹{parseFloat(vendor.debit_credit_balance || 0).toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderInventoryReport = () => {
    if (!Array.isArray(reportData) || reportData.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="information-circle-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No inventory data available</Text>
        </View>
      );
    }

    return (
      <View>
        {reportData.map((item, index) => (
          <View key={item.id || index} style={styles.sectionCard}>
            {Object.entries(item).map(([key, value]) => (
              <View key={key} style={styles.row}>
                <Text style={styles.rowLabel}>{key.replace(/_/g, ' ')}</Text>
                <Text style={styles.rowValue}>{formatValue(value)}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>{config.title}</Text>
          {config.requiresDateRange && (
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDate(true)}
              >
                <Ionicons name="calendar-outline" size={18} color="#007AFF" />
                <Text style={styles.dateButtonText}>Start: {formatDate(startDate)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDate(true)}
              >
                <Ionicons name="calendar-outline" size={18} color="#007AFF" />
                <Text style={styles.dateButtonText}>End: {formatDate(endDate)}</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
            <Ionicons name="bar-chart-outline" size={18} color="#fff" />
            <Text style={styles.generateButtonText}>Generate Report</Text>
          </TouchableOpacity>
          <View style={styles.exportRow}>
            <TouchableOpacity style={styles.exportButton} onPress={handleExportPDF}>
              <Ionicons name="document-text-outline" size={16} color="#007AFF" />
              <Text style={styles.exportButtonText}>Export PDF</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showStartDate && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(_, date) => {
              setShowStartDate(false);
              if (date) setStartDate(date);
            }}
          />
        )}
        {showEndDate && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={(_, date) => {
              setShowEndDate(false);
              if (date) setEndDate(date);
            }}
          />
        )}

        {!reportData && (
          <View style={styles.emptyState}>
            <Ionicons name="pie-chart-outline" size={56} color="#ccc" />
            <Text style={styles.emptyText}>Generate a report to view data</Text>
          </View>
        )}

        {reportData && reportType === 'profit-loss' && renderProfitLoss()}
        {reportData && reportType === 'balance-sheet' && renderBalanceSheet()}
        {reportData && reportType === 'sales' && renderSalesReport()}
        {reportData && reportType === 'gst' && renderGSTReport()}
        {reportData && reportType === 'customers' && renderCustomerReport()}
        {reportData && reportType === 'vendors' && renderVendorReport()}
        {reportData && reportType === 'inventory' && renderInventoryReport()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#F8F9FA',
  },
  dateButtonText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  exportRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  exportButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flexBasis: '48%',
    padding: 16,
    borderRadius: 12,
  },
  summaryLabel: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    paddingRight: 8,
  },
  rowValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    textAlign: 'right',
  },
  highlightRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  highlightText: {
    fontWeight: '700',
    color: '#111',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 12,
    color: '#999',
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  customerEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  customerStats: {
    marginTop: 12,
  },
  expandedSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  transactionSection: {
    marginBottom: 16,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  transactionSubtitle: {
    fontSize: 11,
    fontWeight: '400',
    color: '#666',
  },
  transactionItem: {
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  transactionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  transactionMeta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  transactionNotes: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  transactionTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    marginTop: 8,
  },
  transactionTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  transactionTotalValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  netBalanceCard: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  netBalanceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  netBalanceAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
});

export default ReportDetailScreen;
