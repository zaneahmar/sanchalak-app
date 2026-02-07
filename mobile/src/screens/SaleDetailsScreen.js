import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { salesAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToaster } from '../context/ToasterContext';

const SaleDetailsScreen = ({ route, navigation }) => {
  const { saleId } = route.params || {};
  const { showToast } = useToaster();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSale();
  }, []);

  const fetchSale = async () => {
    try {
      setLoading(true);
      const data = await salesAPI.getById(saleId);
      setSale(data || null);
    } catch (error) {
      console.error('Sale details error:', error);
      showToast('Failed to load sale details', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!sale) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Sale not found</Text>
      </View>
    );
  }

  const getSaleAmount = (data) => {
    const rawAmount = data.total_amount ?? data.amount ?? data.subtotal ?? data.total ?? data.grand_total;
    const parsed = parseFloat(rawAmount);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const saleDate = sale.sale_date || sale.created_at;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Sale #{sale.id}</Text>
        <Text style={styles.subText}>Customer: {sale.customer_name || 'N/A'}</Text>
        <Text style={styles.subText}>
          Date: {saleDate ? new Date(saleDate).toLocaleDateString() : 'N/A'}
        </Text>
        {sale.due_date && (
          <Text style={styles.subText}>
            Due: {new Date(sale.due_date).toLocaleDateString()}
          </Text>
        )}
        <Text style={styles.subText}>Payment: {sale.payment_method || 'Cash'}</Text>
        <Text style={styles.amount}>Total: ₹{getSaleAmount(sale).toFixed(2)}</Text>
        {sale.gst_percentage !== undefined && sale.gst_percentage !== null && (
          <Text style={styles.subText}>GST %: {parseFloat(sale.gst_percentage || 0).toFixed(2)}%</Text>
        )}
        <Text style={styles.subText}>GST: ₹{parseFloat(sale.gst_amount || 0).toFixed(2)}</Text>
        <Text style={styles.subText}>Subtotal: ₹{parseFloat(sale.subtotal || 0).toFixed(2)}</Text>
        {sale.notes && <Text style={styles.subText}>Notes: {sale.notes}</Text>}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('AddSale', { saleId })}
        >
          <Text style={styles.editButtonText}>Edit Sale</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Items</Text>
        {Array.isArray(sale.items) && sale.items.length > 0 ? (
          sale.items.map((item, index) => (
            <View key={item.id || index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product_name || 'Item'}</Text>
                <Text style={styles.subText}>Qty: {item.quantity}</Text>
                <Text style={styles.subText}>Price: ₹{parseFloat(item.unit_price || 0).toFixed(2)}</Text>
                {item.hsn_code && <Text style={styles.subText}>HSN: {item.hsn_code}</Text>}
              </View>
              <Text style={styles.itemTotal}>
                ₹{(parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)).toFixed(2)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.subText}>No items found</Text>
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
  editButton: {
    marginTop: 12,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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

export default SaleDetailsScreen;
