import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { billingAPI, orderAPI, salesAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToaster } from '../context/ToasterContext';

const BillingDetailsScreen = ({ route }) => {
  const { billId } = route.params || {};
  const { showToast } = useToaster();
  const [bill, setBill] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBill();
  }, []);

  const fetchBill = async () => {
    try {
      setLoading(true);
      const data = await billingAPI.getDetails(billId);
      setBill(data || null);
      if (Array.isArray(data?.items) && data.items.length > 0) {
        const mappedItems = data.items.map((item) => ({
          name: item.product_name || item.name || 'Item',
          quantity: item.quantity ?? item.qty ?? 0,
          unit_price: item.unit_price ?? item.price ?? 0,
          cost: item.cost || 0,
        }));
        setItems(mappedItems);
      } else if (data?.order_id) {
        const orderData = await orderAPI.getById(data.order_id);
        const mappedItems = (orderData?.items || []).map((item) => ({
          name: item.product_name || 'Item',
          quantity: item.quantity,
          unit_price: item.unit_price,
          cost: item.cost || 0,
        }));
        setItems(mappedItems);
      } else if (data?.sale_id) {
        const saleData = await salesAPI.getById(data.sale_id);
        const mappedItems = (saleData?.items || []).map((item) => ({
          name: item.product_name || 'Item',
          quantity: item.quantity,
          unit_price: item.unit_price,
          cost: item.cost || 0,
        }));
        setItems(mappedItems);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Billing details error:', error);
      showToast('Failed to load invoice details', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!bill) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Invoice not found</Text>
      </View>
    );
  }

  const getBillAmount = (invoice) => {
    const rawAmount =
      invoice.total_amount ?? invoice.amount ?? invoice.subtotal ?? invoice.total ?? invoice.grand_total;
    const parsed = parseFloat(rawAmount);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const statusValue = String(bill.payment_status || bill.status || 'unpaid').toLowerCase();
  const statusLabel = statusValue.charAt(0).toUpperCase() + statusValue.slice(1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Invoice #{bill.invoice_number}</Text>
        <Text style={styles.subText}>Customer: {bill.customer_name || 'N/A'}</Text>
        <Text style={styles.subText}>Status: {statusLabel || 'N/A'}</Text>
        <Text style={styles.subText}>Method: {bill.payment_method || 'Cash'}</Text>
        <Text style={styles.subText}>
          Date: {(bill.invoice_date || bill.created_at)
            ? new Date(bill.invoice_date || bill.created_at).toLocaleDateString()
            : 'N/A'}
        </Text>
        {bill.due_date && (
          <Text style={styles.subText}>
            Due: {new Date(bill.due_date).toLocaleDateString()}
          </Text>
        )}
        <Text style={styles.amount}>Total: ₹{getBillAmount(bill).toFixed(2)}</Text>
        <Text style={styles.subText}>Subtotal: ₹{parseFloat(bill.subtotal || 0).toFixed(2)}</Text>
        <Text style={styles.subText}>GST: ₹{parseFloat(bill.gst_amount || 0).toFixed(2)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Customer Details</Text>
        <Text style={styles.subText}>Name: {bill.customer_name || 'N/A'}</Text>
        {bill.customer_phone && <Text style={styles.subText}>Phone: {bill.customer_phone}</Text>}
        {bill.customer_email && <Text style={styles.subText}>Email: {bill.customer_email}</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Items</Text>
        {items.length === 0 ? (
          <Text style={styles.subText}>No items found</Text>
        ) : (
          items.map((item, index) => (
            <View key={`${item.name}-${index}`} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.subText}>Qty: {item.quantity}</Text>
                <Text style={styles.subText}>Price: ₹{parseFloat(item.unit_price || 0).toFixed(2)}</Text>
              </View>
              <Text style={styles.itemTotal}>
                ₹{(parseFloat(item.unit_price || 0) * parseFloat(item.quantity || 0)).toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  subText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    marginTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemInfo: {
    flex: 1,
    paddingRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#666',
  },
});

export default BillingDetailsScreen;
