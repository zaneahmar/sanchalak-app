// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.1.9:5000/api';

// Callback for handling token expiration
let tokenExpiredCallback = null;

// Register callback to handle token expiration
export const setTokenExpiredCallback = (callback) => {
  tokenExpiredCallback = callback;
};

// Helper function for API requests
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get token from localStorage
  const token = localStorage.getItem('authToken');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  };

  // Merge headers properly
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(url, mergedOptions);
    
    if (!response.ok) {
      const error = await response.json();
      
      // Handle token expiration (401 status code)
      if (response.status === 401) {
        console.warn('Token expired or invalid:', error.message);
        
        // Call the token expired callback if registered
        if (tokenExpiredCallback) {
          tokenExpiredCallback(error.message);
        }
        
        // Throw error with the message from the server
        throw new Error(error.message || 'Unauthorized');
      }
      
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error: ${endpoint}`, error);
    throw error;
  }
};

// Product API
export const productAPI = {
  getAll: () => apiCall('/products'),
  getById: (id) => apiCall(`/products/${id}`),
  create: (data) => apiCall('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/products/${id}`, {
    method: 'DELETE',
  }),
};

// Customer API
export const customerAPI = {
  getAll: () => apiCall('/customers'),
  getById: (id) => apiCall(`/customers/${id}`),
  create: (data) => apiCall('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/customers/${id}`, {
    method: 'DELETE',
  }),
};

// Order API
export const orderAPI = {
  getAll: () => apiCall('/orders'),
  getById: (id) => apiCall(`/orders/${id}`),
  getByCustomerId: (customerId) => apiCall(`/orders/customer/${customerId}`),
  create: (data) => apiCall('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/orders/${id}`, {
    method: 'DELETE',
  }),
};

// Inventory API
export const inventoryAPI = {
  getAll: () => apiCall('/inventory'),
  getByProductId: (productId) => apiCall(`/inventory/${productId}`),
  create: (data) => apiCall('/inventory', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (productId, data) => apiCall(`/inventory/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (productId) => apiCall(`/inventory/${productId}`, {
    method: 'DELETE',
  }),
};

// Sales API
export const salesAPI = {
  getAll: () => apiCall('/sales'),
  getByDateRange: (startDate, endDate) => 
    apiCall(`/sales/date-range?startDate=${startDate}&endDate=${endDate}`),
  getSummary: () => apiCall('/sales/summary'),
  create: (data) => apiCall('/sales', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/sales/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/sales/${id}`, {
    method: 'DELETE',
  }),
};

// Billing API
export const billingAPI = {
  getAll: () => apiCall('/billing'),
  getById: (id) => apiCall(`/billing/${id}`),
  getByCustomerId: (customerId) => apiCall(`/billing/customer/${customerId}`),
  getDetails: (id) => apiCall(`/billing/details/${id}`),
  downloadPDF: async (id, invoiceNumber) => {
    const url = `${API_BASE_URL}/billing/download/${id}`;
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(url, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(urlBlob);
    } catch (error) {
      console.error(`Download Error: ${id}`, error);
      throw error;
    }
  },
  printPDF: async (id, invoiceNumber) => {
    const url = `${API_BASE_URL}/billing/download/${id}`;
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(url, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      
      // Open PDF in a new window and trigger print
      const printWindow = window.open(urlBlob, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
      
      // Clean up the blob URL after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(urlBlob);
      }, 1000);
    } catch (error) {
      console.error(`Print Error: ${id}`, error);
      throw error;
    }
  },
  create: (data) => apiCall('/billing', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/billing/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/billing/${id}`, {
    method: 'DELETE',
  }),
};

// Vendor API
export const vendorAPI = {
  getAll: () => apiCall('/vendors'),
  getById: (id) => apiCall(`/vendors/${id}`),
  create: (data) => apiCall('/vendors', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/vendors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/vendors/${id}`, {
    method: 'DELETE',
  }),
};

// Purchase Order API
export const purchaseOrderAPI = {
  getAll: () => apiCall('/purchase-orders'),
  getById: (id) => apiCall(`/purchase-orders/${id}`),
  getByStatus: (status) => apiCall(`/purchase-orders/status/${status}`),
  getDropdownProducts: () => apiCall('/purchase-orders/dropdown/products'),
  create: (data) => apiCall('/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/purchase-orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  updateStatus: (id, status) => apiCall(`/purchase-orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  delete: (id) => apiCall(`/purchase-orders/${id}`, {
    method: 'DELETE',
  }),
};

// Payment API
export const paymentAPI = {
  getAll: () => apiCall('/payments'),
  getById: (id) => apiCall(`/payments/${id}`),
  getByBillingId: (billingId) => apiCall(`/payments/billing/${billingId}`),
  getByPoId: (poId) => apiCall(`/payments/po/${poId}`),
  getPaymentSummary: (startDate, endDate) => 
    apiCall(`/payments/summary/period?startDate=${startDate}&endDate=${endDate}`),
  create: (data) => apiCall('/payments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiCall(`/payments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiCall(`/payments/${id}`, {
    method: 'DELETE',
  }),
};

// Reports API
export const reportAPI = {
  getProfitLoss: (startDate, endDate) => 
    apiCall(`/reports/profit-loss?startDate=${startDate}&endDate=${endDate}`),
  getBalanceSheet: () => apiCall('/reports/balance-sheet'),
  getSalesReport: (startDate, endDate) => 
    apiCall(`/reports/sales?startDate=${startDate}&endDate=${endDate}`),
  getGSTReport: (startDate, endDate) => 
    apiCall(`/reports/gst?startDate=${startDate}&endDate=${endDate}`),
  getCustomerReport: (startDate, endDate) => 
    apiCall(`/reports/customers?startDate=${startDate}&endDate=${endDate}`),
  getInventoryReport: () => apiCall('/reports/inventory'),
};

// Debit/Credit API
export const debitCreditAPI = {
  // Invoice Lookup
  getCustomerInvoices: (customerId) => 
    apiCall(`/debit-credit/customer/${customerId}/invoices`),
  getCustomerProducts: (customerId) => 
    apiCall(`/debit-credit/customer/${customerId}/products`),
  getVendorPurchaseOrders: (vendorId) => 
    apiCall(`/debit-credit/vendor/${vendorId}/purchase-orders`),
  getVendorProducts: (vendorId) => 
    apiCall(`/debit-credit/vendor/${vendorId}/products`),
  getInvoiceDetails: (invoiceId) => 
    apiCall(`/debit-credit/invoice/${invoiceId}/details`),
  getPurchaseOrderDetails: (poId) => 
    apiCall(`/debit-credit/purchase-order/${poId}/details`),

  // Customer Debit Notes
  createCustomerDebitNote: (data) => apiCall('/debit-credit/customer/debit-notes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getCustomerDebitNotes: (customerId) => 
    apiCall(`/debit-credit/customer/${customerId}/debit-notes`),
  approveCustomerDebitNote: (debitNoteId) => 
    apiCall(`/debit-credit/customer/debit-notes/${debitNoteId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({}),
    }),
  cancelCustomerDebitNote: (debitNoteId) => 
    apiCall(`/debit-credit/customer/debit-notes/${debitNoteId}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({}),
    }),

  // Customer Credit Notes
  createCustomerCreditNote: (data) => apiCall('/debit-credit/customer/credit-notes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getCustomerCreditNotes: (customerId) => 
    apiCall(`/debit-credit/customer/${customerId}/credit-notes`),
  approveCustomerCreditNote: (creditNoteId) => 
    apiCall(`/debit-credit/customer/credit-notes/${creditNoteId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({}),
    }),
  cancelCustomerCreditNote: (creditNoteId) => 
    apiCall(`/debit-credit/customer/credit-notes/${creditNoteId}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({}),
    }),

  // Customer Balance
  getCustomerBalance: (customerId) => 
    apiCall(`/debit-credit/customer/${customerId}/balance`),
  updateCustomerBalance: (customerId, data) => 
    apiCall(`/debit-credit/customer/${customerId}/balance`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getCustomerDebitCreditSummary: (customerId) => 
    apiCall(`/debit-credit/customer/${customerId}/debit-credit-summary`),
  getCustomerOverview: (customerId) => 
    apiCall(`/debit-credit/customer/${customerId}/overview`),
  getCustomerDebitNoteItems: (debitNoteId) => 
    apiCall(`/debit-credit/customer/debit-note/${debitNoteId}/items`),
  getCustomerCreditNoteItems: (creditNoteId) => 
    apiCall(`/debit-credit/customer/credit-note/${creditNoteId}/items`),
  updateCustomerCreditNote: (creditNoteId, data) => 
    apiCall(`/debit-credit/customer/credit-notes/${creditNoteId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Vendor Debit Notes
  createVendorDebitNote: (data) => apiCall('/debit-credit/vendor/debit-notes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getVendorDebitNotes: (vendorId) => 
    apiCall(`/debit-credit/vendor/${vendorId}/debit-notes`),
  approveVendorDebitNote: (debitNoteId) => 
    apiCall(`/debit-credit/vendor/debit-notes/${debitNoteId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({}),
    }),
  cancelVendorDebitNote: (debitNoteId) => 
    apiCall(`/debit-credit/vendor/debit-notes/${debitNoteId}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({}),
    }),

  // Vendor Credit Notes
  createVendorCreditNote: (data) => apiCall('/debit-credit/vendor/credit-notes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getVendorCreditNotes: (vendorId) => 
    apiCall(`/debit-credit/vendor/${vendorId}/credit-notes`),
  approveVendorCreditNote: (creditNoteId) => 
    apiCall(`/debit-credit/vendor/credit-notes/${creditNoteId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({}),
    }),
  cancelVendorCreditNote: (creditNoteId) => 
    apiCall(`/debit-credit/vendor/credit-notes/${creditNoteId}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({}),
    }),

  // Vendor Balance
  getVendorBalance: (vendorId) => 
    apiCall(`/debit-credit/vendor/${vendorId}/balance`),
  updateVendorBalance: (vendorId, data) => 
    apiCall(`/debit-credit/vendor/${vendorId}/balance`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getVendorDebitCreditSummary: (vendorId) => 
    apiCall(`/debit-credit/vendor/${vendorId}/debit-credit-summary`),
  getVendorOverview: (vendorId) => 
    apiCall(`/debit-credit/vendor/${vendorId}/overview`),
  getVendorDebitNoteItems: (debitNoteId) => 
    apiCall(`/debit-credit/vendor/debit-note/${debitNoteId}/items`),
  getVendorCreditNoteItems: (creditNoteId) => 
    apiCall(`/debit-credit/vendor/credit-note/${creditNoteId}/items`),

  // Debit Note Items
  getCustomerDebitNoteItems: (debitNoteId) => 
    apiCall(`/debit-credit/customer/debit-note/${debitNoteId}/items`),
  getVendorDebitNoteItems: (debitNoteId) => 
    apiCall(`/debit-credit/vendor/debit-note/${debitNoteId}/items`),
  createCustomerDebitNoteWithItems: (data) => apiCall('/debit-credit/customer/debit-notes-with-items', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Credit Note Items & Editing
  getCustomerCreditNoteItems: (creditNoteId) => 
    apiCall(`/debit-credit/customer/credit-note/${creditNoteId}/items`),
  getVendorCreditNoteItems: (creditNoteId) => 
    apiCall(`/debit-credit/vendor/credit-note/${creditNoteId}/items`),
  updateCustomerCreditNote: (creditNoteId, data) => 
    apiCall(`/debit-credit/customer/credit-notes/${creditNoteId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateVendorCreditNote: (creditNoteId, data) => 
    apiCall(`/debit-credit/vendor/credit-notes/${creditNoteId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  createCustomerCreditNoteWithItems: (data) => apiCall('/debit-credit/customer/credit-notes-with-items', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Generic API object for backward compatibility
export const api = {
  get: (endpoint, options = {}) => {
    // Handle params by converting them to query string
    if (options.params) {
      const queryString = new URLSearchParams(options.params).toString();
      endpoint = `${endpoint}?${queryString}`;
      delete options.params;
    }
    return apiCall(endpoint, { method: 'GET', ...options });
  },
  post: (endpoint, data, options = {}) => apiCall(endpoint, { 
    method: 'POST', 
    body: JSON.stringify(data),
    ...options 
  }),
  put: (endpoint, data, options = {}) => apiCall(endpoint, { 
    method: 'PUT', 
    body: JSON.stringify(data),
    ...options 
  }),
  patch: (endpoint, data, options = {}) => apiCall(endpoint, { 
    method: 'PATCH', 
    body: JSON.stringify(data),
    ...options 
  }),
  delete: (endpoint, options = {}) => apiCall(endpoint, { method: 'DELETE', ...options }),
};

// Health check
export const healthCheck = () => apiCall('/health');
