import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { orderAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToaster } from '../context/ToasterContext';
import PlatformPicker from '../components/PlatformPicker';

const OrderDetailsScreen = ({ route, navigation }) => {
  const { orderId } = route.params || {};
  const { showToast } = useToaster();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchOrder();
  }, []);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const data = await orderAPI.getById(orderId);
      setOrder(data || null);
      setStatus(data?.status || 'pending');
    } catch (error) {
      console.error('Order details error:', error);
      showToast('Failed to load order details', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!order) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Order not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Order #{order.id}</Text>
        <Text style={styles.subText}>Customer: {order.customer_name || 'N/A'}</Text>
        <Text style={styles.subText}>Status: {order.status || 'N/A'}</Text>
        <Text style={styles.subText}>
          Date: {order.order_date ? new Date(order.order_date).toLocaleDateString() : 'N/A'}
        </Text>
        <Text style={styles.amount}>Total: ₹{parseFloat(order.total_amount || 0).toFixed(2)}</Text>
        {order.shipping_address && (
          <Text style={styles.subText}>Shipping: {order.shipping_address}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Update Status</Text>
        <PlatformPicker
          selectedValue={status}
          onValueChange={(value) => setStatus(value)}
          items={[
            { label: 'Pending', value: 'pending' },
            { label: 'Processing', value: 'processing' },
            { label: 'Shipped', value: 'shipped' },
            { label: 'Delivered', value: 'delivered' },
            { label: 'Cancelled', value: 'cancelled' },
          ]}
          placeholder={null}
          wrapperStyle={styles.pickerWrapper}
          pickerStyle={styles.picker}
          modalTitle="Update Status"
        />
        <TouchableOpacity
          style={styles.saveButton}
          onPress={async () => {
            try {
              const updated = await orderAPI.update(order.id, { status });
              setOrder((prev) => ({ ...prev, ...updated }));
              showToast('Order status updated', 'success');
            } catch (error) {
              console.error('Update status error:', error);
              showToast('Failed to update status', 'error');
            }
          }}
        >
          <Text style={styles.saveButtonText}>Save Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            Alert.alert('Delete Order', 'Delete this order?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await orderAPI.delete(order.id);
                    showToast('Order deleted', 'success');
                    navigation.goBack();
                  } catch (error) {
                    console.error('Delete order error:', error);
                    showToast('Failed to delete order', 'error');
                  }
                },
              },
            ]);
          }}
        >
          <Text style={styles.deleteButtonText}>Delete Order</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Items</Text>
        {Array.isArray(order.items) && order.items.length > 0 ? (
          order.items.map((item, index) => (
            <View key={item.id || index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product_name || item.name || 'Item'}</Text>
                <Text style={styles.subText}>Qty: {item.quantity}</Text>
                <Text style={styles.subText}>Price: ₹{parseFloat(item.unit_price || 0).toFixed(2)}</Text>
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
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
    minHeight: 50,
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#111',
  },
  saveButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontWeight: '700',
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

export default OrderDetailsScreen;
