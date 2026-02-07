import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { paymentAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToaster } from '../context/ToasterContext';

const PaymentDetailsScreen = ({ route }) => {
  const { paymentId } = route.params || {};
  const { showToast } = useToaster();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayment();
  }, []);

  const fetchPayment = async () => {
    try {
      setLoading(true);
      const data = await paymentAPI.getById(paymentId);
      setPayment(data || null);
    } catch (error) {
      console.error('Payment details error:', error);
      showToast('Failed to load payment details', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!payment) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Payment not found</Text>
      </View>
    );
  }

  const derivedType = (() => {
    if (payment.payment_type) return payment.payment_type;
    if (payment.billing_id) return 'customer';
    if (payment.po_id) return 'vendor';
    if (payment.customer_name) return 'customer';
    if (payment.vendor_name) return 'vendor';
    return 'N/A';
  })();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Payment #{payment.id}</Text>
        <Text style={styles.subText}>Type: {derivedType}</Text>
        <Text style={styles.subText}>
          {derivedType === 'customer'
            ? `Customer: ${payment.customer_name || 'N/A'}`
            : derivedType === 'vendor'
              ? `Vendor: ${payment.vendor_name || 'N/A'}`
              : `Entity: ${payment.customer_name || payment.vendor_name || 'N/A'}`}
        </Text>
        <Text style={styles.subText}>Method: {payment.payment_method || 'N/A'}</Text>
        <Text style={styles.subText}>
          Date: {payment.payment_date || payment.created_at
            ? new Date(payment.payment_date || payment.created_at).toLocaleDateString()
            : 'N/A'}
        </Text>
        {payment.reference_number && (
          <Text style={styles.subText}>Reference: {payment.reference_number}</Text>
        )}
        {payment.billing_id && (
          <Text style={styles.subText}>Invoice ID: {payment.billing_id}</Text>
        )}
        {payment.po_id && (
          <Text style={styles.subText}>PO ID: {payment.po_id}</Text>
        )}
        {payment.notes && <Text style={styles.subText}>Notes: {payment.notes}</Text>}
        <Text style={styles.amount}>Amount: ₹{parseFloat(payment.amount || 0).toFixed(2)}</Text>
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#666',
  },
});

export default PaymentDetailsScreen;
