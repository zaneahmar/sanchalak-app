import React, { createContext, useState, useEffect, useContext } from 'react';
import { productAPI, customerAPI, orderAPI, salesAPI, billingAPI, vendorAPI } from '../services/api';
import { useToaster } from './ToasterContext';
import { AuthContext } from './AuthContext';

export const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState([]);
  const [billing, setBilling] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isBlurred, setIsBlurred] = useState(false);
  
  const { showToast } = useToaster();
  const { isAuthenticated } = useContext(AuthContext);

  // Clear all data when user logs out
  const clearAllData = () => {
    setProducts([]);
    setCustomers([]);
    setVendors([]);
    setOrders([]);
    setSales([]);
    setBilling([]);
    setError(null);
    setIsBlurred(false);
  };

  const toggleBlur = () => {
    setIsBlurred((prev) => !prev);
  };

  // Load data from backend only when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    } else {
      clearAllData();
    }
  }, [isAuthenticated]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsData, customersData, vendorsData, ordersData, salesData, billingData] = await Promise.all([
        productAPI.getAll().catch(() => []),
        customerAPI.getAll().catch(() => []),
        vendorAPI.getAll().catch(() => []),
        orderAPI.getAll().catch(() => []),
        salesAPI.getAll().catch(() => []),
        billingAPI.getAll().catch(() => []),
      ]);
      setProducts(productsData);
      setCustomers(customersData);
      setVendors(vendorsData);
      setOrders(ordersData);
      setSales(salesData);
      setBilling(billingData);
    } catch (err) {
      const errorMsg = err.message || 'Failed to load data';
      setError(errorMsg);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Individual fetch methods
  const fetchProducts = async () => {
    try {
      const data = await productAPI.getAll();
      setProducts(data);
      return { success: true, data };
    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch products';
      setError(errorMsg);
      console.error('Error fetching products:', err);
      return { success: false, error: errorMsg };
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await customerAPI.getAll();
      setCustomers(data);
      return { success: true, data };
    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch customers';
      setError(errorMsg);
      console.error('Error fetching customers:', err);
      return { success: false, error: errorMsg };
    }
  };

  const fetchVendors = async () => {
    try {
      const data = await vendorAPI.getAll();
      setVendors(data);
      return { success: true, data };
    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch vendors';
      setError(errorMsg);
      console.error('Error fetching vendors:', err);
      return { success: false, error: errorMsg };
    }
  };

  const fetchOrders = async () => {
    try {
      const data = await orderAPI.getAll();
      setOrders(data);
      return { success: true, data };
    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch orders';
      setError(errorMsg);
      console.error('Error fetching orders:', err);
      return { success: false, error: errorMsg };
    }
  };

  // Products Management
  const addProduct = async (product) => {
    try {
      const newProduct = await productAPI.create({
        name: product.name,
        description: product.description || '',
        price: parseFloat(product.price),
        cost: parseFloat(product.cost) || 0,
        sku: product.sku,
        category: product.category || 'General',
        stock_quantity: parseInt(product.stock_quantity) || 0,
        color: product.color || '',
        hsn_code: product.hsn_code || '',
      });
      setProducts([...products, newProduct]);
      showToast(`Product "${product.name}" added successfully`, 'success');
      return newProduct;
    } catch (err) {
      const errorMsg = err.message || 'Failed to add product';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      throw err;
    }
  };

  const updateProduct = async (id, productData) => {
    try {
      const updatedProduct = await productAPI.update(id, productData);
      setProducts(products.map(p => (p.id === id ? updatedProduct : p)));
      showToast('Product updated successfully', 'success');
      return updatedProduct;
    } catch (err) {
      const errorMsg = err.message || 'Failed to update product';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      throw err;
    }
  };

  const deleteProduct = async (id) => {
    try {
      await productAPI.delete(id);
      setProducts(products.filter(p => p.id !== id));
      showToast('Product deleted successfully', 'success');
    } catch (err) {
      const errorMsg = err.message || 'Failed to delete product';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      throw err;
    }
  };

  // Customers Management
  const addCustomer = async (customerData) => {
    try {
      const newCustomer = await customerAPI.create(customerData);
      setCustomers([...customers, newCustomer]);
      showToast('Customer added successfully', 'success');
      return newCustomer;
    } catch (err) {
      const errorMsg = err.message || 'Failed to add customer';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      throw err;
    }
  };

  const updateCustomer = async (id, customerData) => {
    try {
      const updatedCustomer = await customerAPI.update(id, customerData);
      setCustomers(customers.map(c => (c.id === id ? updatedCustomer : c)));
      showToast('Customer updated successfully', 'success');
      return updatedCustomer;
    } catch (err) {
      const errorMsg = err.message || 'Failed to update customer';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      throw err;
    }
  };

  const deleteCustomer = async (id) => {
    try {
      await customerAPI.delete(id);
      setCustomers(customers.filter(c => c.id !== id));
      showToast('Customer deleted successfully', 'success');
    } catch (err) {
      const errorMsg = err.message || 'Failed to delete customer';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      throw err;
    }
  };

  // Vendors Management
  const addVendor = async (vendorData) => {
    try {
      const newVendor = await vendorAPI.create(vendorData);
      setVendors([...vendors, newVendor]);
      showToast('Vendor added successfully', 'success');
      return newVendor;
    } catch (err) {
      const errorMsg = err.message || 'Failed to add vendor';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      throw err;
    }
  };

  const updateVendor = async (id, vendorData) => {
    try {
      const updatedVendor = await vendorAPI.update(id, vendorData);
      setVendors(vendors.map(v => (v.id === id ? updatedVendor : v)));
      showToast('Vendor updated successfully', 'success');
      return updatedVendor;
    } catch (err) {
      const errorMsg = err.message || 'Failed to update vendor';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      throw err;
    }
  };

  const deleteVendor = async (id) => {
    try {
      await vendorAPI.delete(id);
      setVendors(vendors.filter(v => v.id !== id));
      showToast('Vendor deleted successfully', 'success');
    } catch (err) {
      const errorMsg = err.message || 'Failed to delete vendor';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      throw err;
    }
  };

  // Orders Management
  const addOrder = async (orderData) => {
    try {
      const newOrder = await orderAPI.create(orderData);
      setOrders([...orders, newOrder]);
      showToast('Order created successfully', 'success');
      return newOrder;
    } catch (err) {
      const errorMsg = err.message || 'Failed to create order';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      throw err;
    }
  };

  const updateOrder = async (id, orderData) => {
    try {
      const updatedOrder = await orderAPI.update(id, orderData);
      setOrders(orders.map(o => (o.id === id ? updatedOrder : o)));
      showToast('Order updated successfully', 'success');
      return updatedOrder;
    } catch (err) {
      const errorMsg = err.message || 'Failed to update order';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      throw err;
    }
  };

  const deleteOrder = async (id) => {
    try {
      await orderAPI.delete(id);
      setOrders(orders.filter(o => o.id !== id));
      showToast('Order deleted successfully', 'success');
    } catch (err) {
      const errorMsg = err.message || 'Failed to delete order';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      throw err;
    }
  };

  return (
    <DataContext.Provider
      value={{
        products,
        customers,
        vendors,
        orders,
        sales,
        billing,
        loading,
        isLoading: loading,
        error,
        isBlurred,
        toggleBlur,
        loadAllData,
        clearAllData,
        // Fetch methods
        fetchProducts,
        fetchCustomers,
        fetchVendors,
        fetchOrders,
        // Products
        addProduct,
        updateProduct,
        deleteProduct,
        // Customers
        addCustomer,
        updateCustomer,
        deleteCustomer,
        // Vendors
        addVendor,
        updateVendor,
        deleteVendor,
        // Orders
        addOrder,
        updateOrder,
        deleteOrder,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
