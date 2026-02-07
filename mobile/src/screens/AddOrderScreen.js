import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import PlatformPicker from '../components/PlatformPicker';
import { Ionicons } from '@expo/vector-icons';
import { customerAPI, productAPI, orderAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToaster } from '../context/ToasterContext';

const AddOrderScreen = ({ navigation }) => {
  const { showToast } = useToaster();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    product_name: '',
    quantity: '1',
    unit_price: '',
    size: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [customersData, productsData] = await Promise.all([
        customerAPI.getAll(),
        productAPI.getAll(),
      ]);
      setCustomers(customersData || []);
      setProducts(productsData || []);
    } catch (error) {
      console.error('Order data error:', error);
      showToast('Failed to load order data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (productId) => {
    const product = products.find((p) => p.id === parseInt(productId, 10));
    if (product) {
      setCurrentItem({
        product_id: productId,
        product_name: product.name,
        quantity: '1',
        unit_price: product.price?.toString() || '0',
        size: product.category || '',
      });
    }
  };

  const handleAddItem = () => {
    if (!currentItem.product_id || !currentItem.quantity || !currentItem.unit_price) {
      showToast('Select a product and enter quantity', 'error');
      return;
    }

    const quantity = parseInt(currentItem.quantity, 10);
    const unitPrice = parseFloat(currentItem.unit_price);
    if (quantity <= 0 || unitPrice <= 0) {
      showToast('Quantity and price must be greater than 0', 'error');
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        product_id: parseInt(currentItem.product_id, 10),
        product_name: currentItem.product_name,
        quantity,
        unit_price: unitPrice,
        size: currentItem.size,
      },
    ]);

    setCurrentItem({
      product_id: '',
      product_name: '',
      quantity: '1',
      unit_price: '',
      size: '',
    });

    showToast('Item added', 'success');
  };

  const handleRemoveItem = (index) => {
    Alert.alert('Remove Item', 'Remove this item from the order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setItems((prev) => prev.filter((_, i) => i !== index)),
      },
    ]);
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + parseFloat(item.unit_price || 0) * parseInt(item.quantity || 0, 10),
    0
  );

  const handleSubmit = async () => {
    if (!customerId || items.length === 0) {
      showToast('Select a customer and add items', 'error');
      return;
    }

    try {
      setLoading(true);
      await orderAPI.create({
        customer_id: parseInt(customerId, 10),
        total_amount: totalAmount,
        status: 'pending',
        notes,
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      });
      showToast('Order created successfully', 'success');
      navigation.goBack();
    } catch (error) {
      console.error('Create order error:', error);
      showToast('Failed to create order', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && customers.length === 0 && products.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <PlatformPicker
            selectedValue={customerId}
            onValueChange={(value) => setCustomerId(value)}
            items={customers.map((customer) => ({
              label: `${customer.name} ${customer.phone ? `- ${customer.phone}` : ''}`,
              value: customer.id?.toString(),
            }))}
            placeholder="-- Select Customer --"
            wrapperStyle={styles.pickerWrapper}
            pickerStyle={styles.picker}
            modalTitle="Select Customer"
          />
        </View>

        <View style={styles.section}
        >
          <Text style={styles.sectionTitle}>Add Items</Text>
          <PlatformPicker
            selectedValue={currentItem.product_id}
            onValueChange={(value) => handleProductSelect(value)}
            items={products.map((product) => ({
              label: `${product.name} (${product.stock_quantity || 0} in stock)`,
              value: product.id?.toString(),
            }))}
            placeholder="-- Select Product --"
            wrapperStyle={styles.pickerWrapper}
            pickerStyle={styles.picker}
            modalTitle="Select Product"
          />

          <View style={styles.row}
          >
            <View style={styles.halfWidth}
            >
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                value={currentItem.quantity}
                onChangeText={(value) => setCurrentItem((prev) => ({ ...prev, quantity: value }))}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.halfWidth}
            >
              <Text style={styles.label}>Price</Text>
              <TextInput
                style={styles.input}
                value={currentItem.unit_price}
                onChangeText={(value) => setCurrentItem((prev) => ({ ...prev, unit_price: value }))}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.addButtonText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            {items.map((item, index) => (
              <View key={`${item.product_id}-${index}`} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <Text style={styles.itemText}>Qty: {item.quantity}</Text>
                  <Text style={styles.itemText}>Price: ₹{parseFloat(item.unit_price || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemTotal}>
                    ₹{(parseFloat(item.unit_price || 0) * parseInt(item.quantity || 0, 10)).toFixed(2)}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                    <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <Text style={styles.totalText}>Total: ₹{totalAmount.toFixed(2)}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add order notes..."
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Create Order</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
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
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
  },
  totalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default AddOrderScreen;
