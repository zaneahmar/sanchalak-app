import React, { useCallback, useLayoutEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { purchaseOrderAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToaster } from '../context/ToasterContext';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const PurchaseOrderDetailsScreen = ({ route, navigation }) => {
  const { poId } = route.params || {};
  const { showToast } = useToaster();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);

  const formatDate = useCallback((value) => {
    if (!value) {
      return 'N/A';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }
    return date.toLocaleDateString();
  }, []);

  const fetchPO = useCallback(async () => {
    try {
      setLoading(true);
      const data = await purchaseOrderAPI.getById(poId);
      setPo(data || null);
    } catch (error) {
      console.error('PO details error:', error);
      showToast('Failed to load purchase order', 'error');
    } finally {
      setLoading(false);
    }
  }, [poId, showToast]);

  useFocusEffect(
    useCallback(() => {
      if (poId) {
        fetchPO();
      }
    }, [fetchPO, poId])
  );

  useLayoutEffect(() => {
    if (!poId) {
      return;
    }

    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('AddPurchaseOrder', { poId })}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, poId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!po) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Purchase order not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>PO #{po.po_number || po.id}</Text>
        <Text style={styles.subText}>Vendor: {po.vendor_name || 'N/A'}</Text>
        <Text style={styles.subText}>Status: {po.status || 'N/A'}</Text>
        <Text style={styles.subText}>
          Date: {formatDate(po.po_date || po.order_date || po.created_at)}
        </Text>
        {(po.expected_delivery_date || po.expected_delivery) && (
          <Text style={styles.subText}>
            Expected: {formatDate(po.expected_delivery_date || po.expected_delivery)}
          </Text>
        )}
        <Text style={styles.amount}>Total: ₹{parseFloat(po.total_amount || 0).toFixed(2)}</Text>
        {po.notes && <Text style={styles.subText}>Notes: {po.notes}</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Items</Text>
        {Array.isArray(po.items) && po.items.length > 0 ? (
          po.items.map((item, index) => (
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
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});

export default PurchaseOrderDetailsScreen;
