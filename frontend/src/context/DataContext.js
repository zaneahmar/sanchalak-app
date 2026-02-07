import React, { createContext, useContext, useState, useEffect } from 'react';
import { productAPI, customerAPI, orderAPI, inventoryAPI, salesAPI, billingAPI } from '../services/api';
import { useToaster } from './ToasterContext';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [billing, setBilling] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isBlurred, setIsBlurred] = useState(false);
  
  const toaster = useToaster();
  const { isAuthenticated, token, registerDataContextClear } = useAuth();

  const toggleBlur = () => {
    setIsBlurred(!isBlurred);
  };

  // Clear all data when user logs out
  const clearAllData = () => {
    setInventory([]);
    setOrders([]);
    setSales([]);
    setCustomers([]);
    setBilling([]);
    setError(null);
    setIsBlurred(false);
  };

  // Register the clear function with AuthContext
  useEffect(() => {
    if (registerDataContextClear) {
      registerDataContextClear(clearAllData);
    }
  }, [registerDataContextClear]);

  // Load data from backend only when authenticated, clear when logged out
  useEffect(() => {
    if (isAuthenticated && token) {
      loadAllData();
    } else {
      // Clear all data when user is not authenticated
      clearAllData();
    }
  }, [isAuthenticated, token]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsData, customersData, ordersData, salesData, billingData] = await Promise.all([
        productAPI.getAll(),
        customerAPI.getAll(),
        orderAPI.getAll(),
        salesAPI.getAll(),
        billingAPI.getAll(),
      ]);
      setInventory(productsData);
      setCustomers(customersData);
      setOrders(ordersData);
      setSales(salesData);
      setBilling(billingData);
    } catch (err) {
      const errorMsg = err.message || 'Failed to load data';
      setError(errorMsg);
      toaster.error(errorMsg);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Inventory Management
  const addProduct = async (product) => {
    try {
      const newProduct = await productAPI.create({
        name: product.name,
        description: product.description || '',
        price: parseFloat(product.price),
        cost: parseFloat(product.cost) || 0,
        sku: product.sku,
        category: product.size || 'General',
        stock_quantity: parseInt(product.stock) || 0,
        color : product.color || '',
        hsn_code: product.hsn || '',
      });
      setInventory([...inventory, newProduct]);
      toaster.success(`Product "${product.name}" added successfully`);
      return newProduct;
    } catch (err) {
      const errorMsg = err.message || 'Failed to add product';
      setError(errorMsg);
      toaster.error(errorMsg);
      throw err;
    }
  };

  const updateProduct = async (id, updatedProduct) => {
    try {
      const updated = await productAPI.update(id, {
        name: updatedProduct.name,
        description: updatedProduct.description || '',
        price: parseFloat(updatedProduct.price),
        cost: parseFloat(updatedProduct.cost) || 0,
        sku: updatedProduct.sku,
        category: updatedProduct.size || 'General',
        stock_quantity: parseInt(updatedProduct.stock) || 0,
        color : updatedProduct.color || '',
        hsn_code: updatedProduct.hsn || '',
      });
      setInventory(inventory.map(p => p.id === id ? updated : p));
      toaster.success(`Product updated successfully`);
      return updated;
    } catch (err) {
      const errorMsg = err.message || 'Failed to update product';
      setError(errorMsg);
      toaster.error(errorMsg);
      throw err;
    }
  };

  const deleteProduct = async (id) => {
    try {
      await productAPI.delete(id);
      setInventory(inventory.filter(p => p.id !== id));
      toaster.success('Product deleted successfully');
    } catch (err) {
      const errorMsg = err.message || 'Failed to delete product';
      setError(errorMsg);
      toaster.error(errorMsg);
      throw err;
    }
  };

  const getProductById = (id) => {
    return inventory.find(p => p.id === id);
  };

  // Customer Management
  const addCustomer = async (customer) => {
    try {
      const newCustomer = await customerAPI.create({
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        zip_code: customer.zipCode || '',
      });
      setCustomers([...customers, newCustomer]);
      toaster.success(`Customer "${customer.name}" added successfully`);
      return newCustomer;
    } catch (err) {
      const errorMsg = err.message || 'Failed to add customer';
      setError(errorMsg);
      toaster.error(errorMsg);
      throw err;
    }
  };

  const updateCustomer = async (id, updatedCustomer) => {
    try {
      const updated = await customerAPI.update(id, {
        name: updatedCustomer.name,
        email: updatedCustomer.email,
        phone: updatedCustomer.phone || '',
        address: updatedCustomer.address || '',
        city: updatedCustomer.city || '',
        state: updatedCustomer.state || '',
        zip_code: updatedCustomer.zipCode || '',
      });
      setCustomers(customers.map(c => c.id === id ? updated : c));
      toaster.success('Customer updated successfully');
      return updated;
    } catch (err) {
      const errorMsg = err.message || 'Failed to update customer';
      setError(errorMsg);
      toaster.error(errorMsg);
      throw err;
    }
  };

  const deleteCustomer = async (id) => {
    try {
      await customerAPI.delete(id);
      setCustomers(customers.filter(c => c.id !== id));
      toaster.success('Customer deleted successfully');
    } catch (err) {
      const errorMsg = err.message || 'Failed to delete customer';
      setError(errorMsg);
      toaster.error(errorMsg);
      throw err;
    }
  };

  // Order Management
  const addOrder = async (order) => {
    try {
      // Transform items to match backend schema
      const transformedItems = (order.items || []).map(item => ({
        product_id: item.productId,
        quantity: parseInt(item.quantity) || 1,
        unit_price: parseFloat(item.price) || 0,
      }));

      const newOrder = await orderAPI.create({
        customer_id: order.customerId,
        total_amount: parseFloat(order.totalAmount) || 0,
        status: order.status || 'pending',
        shipping_address: order.shippingAddress || '',
        items: transformedItems,
      });
      
      // Reload orders to get all orders with their items
      const allOrders = await orderAPI.getAll();
      setOrders(allOrders);
      
      toaster.success('Order created successfully');
      return newOrder;
    } catch (err) {
      const errorMsg = err.message || 'Failed to create order';
      setError(errorMsg);
      toaster.error(errorMsg);
      throw err;
    }
  };

  const updateOrder = async (id, updatedOrder) => {
    try {
      // Build update object, only including fields that are explicitly provided
      const updatePayload = {};
      
      if (updatedOrder.hasOwnProperty('totalAmount')) {
        updatePayload.total_amount = parseFloat(updatedOrder.totalAmount) || 0;
      }
      if (updatedOrder.hasOwnProperty('status')) {
        updatePayload.status = updatedOrder.status || 'pending';
      }
      if (updatedOrder.hasOwnProperty('shippingAddress')) {
        updatePayload.shipping_address = updatedOrder.shippingAddress || '';
      }
      
      const updated = await orderAPI.update(id, updatePayload);
      setOrders(orders.map(o => o.id === id ? { ...o, ...updated } : o));
      
      // Refresh billing data when order is updated
      const billingData = await billingAPI.getAll();
      setBilling(billingData);
      
      toaster.success('Order updated successfully');
      return updated;
    } catch (err) {
      const errorMsg = err.message || 'Failed to update order';
      setError(errorMsg);
      toaster.error(errorMsg);
      throw err;
    }
  };

  const deleteOrder = async (id) => {
    try {
      await orderAPI.delete(id);
      setOrders(orders.filter(o => o.id !== id));
      
      // Refresh billing data when order is deleted
      const billingData = await billingAPI.getAll();
      setBilling(billingData);
      
      toaster.success('Order deleted successfully');
    } catch (err) {
      const errorMsg = err.message || 'Failed to delete order';
      setError(errorMsg);
      toaster.error(errorMsg);
      throw err;
    }
  };

  const updateOrderStatus = async (id, status) => {
    return updateOrder(id, { status });
  };

  // Sales Management
  const addSale = async (sale) => {
    try {
      const newSale = await salesAPI.create({
        customerId: sale.customerId || null,
        items: sale.items || [],
        subtotal: parseFloat(sale.subtotal) || 0,
        gstPercentage: parseFloat(sale.gstPercentage) || 0,
        gstAmount: parseFloat(sale.gstAmount) || 0,
        totalAmount: parseFloat(sale.totalAmount) || 0,
        paymentMethod: sale.paymentMethod || 'cash',
        notes: sale.notes || '',
        saleDate: sale.saleDate || new Date().toISOString().split('T')[0],
        dueDate: sale.dueDate || null,
      });
      setSales([...sales, newSale]);
      
      // Refresh inventory after sale is recorded
      const updatedInventory = await productAPI.getAll();
      setInventory(updatedInventory);
      
      toaster.success('Sale recorded successfully');
      return newSale;
    } catch (err) {
      const errorMsg = err.message || 'Failed to record sale';
      setError(errorMsg);
      toaster.error(errorMsg);
      throw err;
    }
  };

  const updateSale = async (id, updatedSale) => {
    try {
      const updatedSaleData = await salesAPI.update(id, {
        customerId: updatedSale.customerId || null,
        items: updatedSale.items || [],
        subtotal: parseFloat(updatedSale.subtotal) || 0,
        gstPercentage: parseFloat(updatedSale.gstPercentage) || 0,
        gstAmount: parseFloat(updatedSale.gstAmount) || 0,
        totalAmount: parseFloat(updatedSale.totalAmount) || 0,
        paymentMethod: updatedSale.paymentMethod || 'cash',
        notes: updatedSale.notes || '',
        saleDate: updatedSale.saleDate || new Date().toISOString().split('T')[0],
        dueDate: updatedSale.dueDate || null,
      });

      setSales(sales.map(s => s.id === id ? updatedSaleData.sale : s));
      
      // Refresh inventory after sale update
      const updatedInventory = await productAPI.getAll();
      setInventory(updatedInventory);
      
      toaster.success('Sale updated successfully');
      return updatedSaleData.sale;
    } catch (err) {
      const errorMsg = err.message || 'Failed to update sale';
      setError(errorMsg);
      toaster.error(errorMsg);
      throw err;
    }
  };

  const deleteSale = async (id) => {
    try {
      await salesAPI.delete(id);
      setSales(sales.filter(s => s.id !== id));
      
      // Refresh inventory after deleting sale (stock is restored)
      const updatedInventory = await productAPI.getAll();
      setInventory(updatedInventory);
      
      toaster.success('Sale deleted successfully');
    } catch (err) {
      const errorMsg = err.message || 'Failed to delete sale';
      setError(errorMsg);
      toaster.error(errorMsg);
      throw err;
    }
  };

  // Analytics
  const getTotalSales = () => {
    const total = sales.reduce((total, sale) => total + (parseFloat(sale.total_amount) || parseFloat(sale.totalAmount) || 0), 0);
    return total || 0;
  };

  const getTotalOrders = () => {
    return sales.length;
  };

  const getLowStockProducts = (threshold = 10) => {
    return inventory.filter(p => (p.stock_quantity || p.stock || 0) <= threshold);
  };

  const getTotalInventoryValue = () => {
    const total = inventory.reduce((total, p) => total + ((parseFloat(p.price) || 0) * (parseInt(p.stock_quantity) || parseInt(p.stock) || 0)), 0);
    return total || 0;
  };

  const value = {
    inventory,
    orders,
    sales,
    customers,
    billing,
    loading,
    error,
    isBlurred,
    toggleBlur,
    loadAllData,
    clearAllData,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    addSale,
    updateSale,
    deleteSale,
    getTotalSales,
    getTotalOrders,
    getLowStockProducts,
    getTotalInventoryValue,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};
