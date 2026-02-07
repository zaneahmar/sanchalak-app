import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import PlatformPicker from '../components/PlatformPicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { purchaseOrderAPI, vendorAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToaster } from '../context/ToasterContext';

const AddPurchaseOrderScreen = ({ navigation, route }) => {
  const { showToast } = useToaster();
  const { poId } = route.params || {};
  const isEditing = useMemo(() => Boolean(poId), [poId]);
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [showExpectedDate, setShowExpectedDate] = useState(false);
  
  const [formData, setFormData] = useState({
    po_number: `PO-${Date.now()}`,
    vendor_id: '',
    status: 'pending',
    notes: '',
    expected_delivery: new Date(),
    items: [],
  });

  const [currentItem, setCurrentItem] = useState({
    product_name: '',
    size: '',
    quantity: '',
    unit_price: '',
    hsn_code: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!isEditing) {
      return;
    }
    fetchPurchaseOrder();
  }, [isEditing]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vendorsData] = await Promise.all([
        vendorAPI.getAll(),
      ]);
      setVendors(vendorsData || []);
    } catch (error) {
      showToast('Error fetching data', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrder = async () => {
    try {
      setLoading(true);
      const data = await purchaseOrderAPI.getById(poId);
      if (!data) {
        showToast('Purchase order not found', 'error');
        return;
      }

      const expectedDeliveryValue = data.expected_delivery || data.expected_delivery_date;
      const parsedExpectedDelivery = expectedDeliveryValue ? new Date(expectedDeliveryValue) : new Date();

      setFormData({
        po_number: data.po_number || `PO-${Date.now()}`,
        vendor_id: data.vendor_id || '',
        status: data.status || 'pending',
        notes: data.notes || '',
        expected_delivery: parsedExpectedDelivery,
        items: Array.isArray(data.items)
          ? data.items.map((item) => ({
              product_name: item.product_name || '',
              size: item.size || '',
              quantity: item.quantity ?? '',
              unit_price: item.unit_price ?? '',
              hsn_code: item.hsn_code || '',
              total:
                parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0),
            }))
          : [],
      });
    } catch (error) {
      console.error('PO fetch error:', error);
      showToast('Failed to load purchase order', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!currentItem.product_name || !currentItem.size || !currentItem.quantity || !currentItem.unit_price) {
      showToast('Please fill all item fields', 'error');
      return;
    }

    if (parseFloat(currentItem.quantity) <= 0 || parseFloat(currentItem.unit_price) <= 0) {
      showToast('Quantity and unit price must be greater than 0', 'error');
      return;
    }

    const newItem = {
      ...currentItem,
      quantity: parseFloat(currentItem.quantity),
      unit_price: parseFloat(currentItem.unit_price),
      total: parseFloat(currentItem.quantity) * parseFloat(currentItem.unit_price),
    };

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    setCurrentItem({
      product_name: '',
      size: '',
      quantity: '',
      unit_price: '',
      hsn_code: '',
    });

    showToast('Item added', 'success');
  };

  const handleRemoveItem = (index) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setFormData((prev) => ({
              ...prev,
              items: prev.items.filter((_, i) => i !== index),
            }));
            showToast('Item removed', 'success');
          },
        },
      ]
    );
  };

  const handleEditItem = (index) => {
    const item = formData.items[index];
    if (!item) {
      return;
    }

    setCurrentItem({
      product_name: item.product_name || '',
      size: item.size || '',
      quantity: item.quantity?.toString() || '',
      unit_price: item.unit_price?.toString() || '',
      hsn_code: item.hsn_code || '',
    });

    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));

    showToast('Edit the item and tap Add Item to update', 'info');
  };

  const handleSubmit = async () => {
    if (!formData.vendor_id) {
      showToast('Please select a vendor', 'error');
      return;
    }

    if (formData.items.length === 0) {
      showToast('Please add at least one item', 'error');
      return;
    }

    const totalAmount = formData.items.reduce((sum, item) => sum + item.total, 0);

    const vendorId = Number(formData.vendor_id);
    if (Number.isNaN(vendorId)) {
      showToast('Invalid vendor selected', 'error');
      return;
    }

    const itemsPayload = formData.items.map((item) => ({
      product_name: item.product_name,
      size: item.size,
      hsn_code: item.hsn_code || '',
      quantity: parseFloat(item.quantity) || 0,
      unit_price: parseFloat(item.unit_price) || 0,
    }));

    const poData = {
      po_number: formData.po_number,
      vendor_id: vendorId,
      status: formData.status,
      notes: formData.notes,
      expected_delivery: formData.expected_delivery
        ? formData.expected_delivery.toISOString().split('T')[0]
        : null,
      total_amount: totalAmount,
      items: itemsPayload,
    };

    try {
      setLoading(true);
      if (isEditing) {
        await purchaseOrderAPI.update(poId, poData);
        showToast('Purchase order updated successfully', 'success');
      } else {
        await purchaseOrderAPI.create(poData);
        showToast('Purchase order created successfully', 'success');
      }
      navigation.goBack();
    } catch (error) {
      showToast(error.message || 'Error saving purchase order', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = formData.items.reduce((sum, item) => sum + item.total, 0);

  if (loading && vendors.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>
            {isEditing ? 'Edit Purchase Order' : 'Create Purchase Order'}
          </Text>
          <Text style={styles.pageSubtitle}>
            {isEditing
              ? 'Update vendor order details and items'
              : 'Capture vendor order details and items'}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order Details</Text>
        {/* PO Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>PO Number *</Text>
          <TextInput
            style={styles.input}
            value={formData.po_number}
            onChangeText={(text) => setFormData({ ...formData, po_number: text })}
            placeholder="Enter PO number"
            editable={!isEditing}
          />
        </View>

        {/* Vendor Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vendor *</Text>
          <PlatformPicker
            selectedValue={formData.vendor_id}
            onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}
            items={vendors.map((vendor) => ({
              label: vendor.name,
              value: vendor.id,
            }))}
            placeholder="-- Select Vendor --"
            wrapperStyle={styles.pickerWrapper}
            pickerStyle={styles.picker}
            modalTitle="Select Vendor"
          />
        </View>

        {/* Status */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Status</Text>
          <PlatformPicker
            selectedValue={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
            items={[
              { label: 'Pending', value: 'pending' },
              { label: 'Approved', value: 'approved' },
              { label: 'Received', value: 'received' },
              { label: 'Cancelled', value: 'cancelled' },
            ]}
            placeholder={null}
            wrapperStyle={styles.pickerContainer}
            pickerStyle={styles.picker}
            modalTitle="Status"
          />
        </View>

        {/* Expected Delivery Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Expected Delivery Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowExpectedDate(true)}
          >
            <Text style={styles.dateText}>
              {formData.expected_delivery.toLocaleDateString()}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
          {showExpectedDate && (
            <DateTimePicker
              value={formData.expected_delivery}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowExpectedDate(false);
                if (selectedDate) {
                  setFormData({ ...formData, expected_delivery: selectedDate });
                }
              }}
            />
          )}
        </View>

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Add notes (optional)"
            multiline
            numberOfLines={3}
          />
        </View>
        </View>

        {/* Items Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Add Items</Text>

          {/* Add Item Form */}
          <View style={styles.itemForm}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product Name *</Text>
            <TextInput
              style={styles.input}
              value={currentItem.product_name}
              onChangeText={(text) => setCurrentItem({ ...currentItem, product_name: text })}
              placeholder="Enter product name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Size *</Text>
            <TextInput
              style={styles.input}
              value={currentItem.size}
              onChangeText={(text) => setCurrentItem({ ...currentItem, size: text })}
              placeholder="Enter size"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Quantity *</Text>
              <TextInput
                style={styles.input}
                value={currentItem.quantity}
                onChangeText={(text) => setCurrentItem({ ...currentItem, quantity: text })}
                placeholder="Qty"
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Unit Price *</Text>
              <TextInput
                style={styles.input}
                value={currentItem.unit_price}
                onChangeText={(text) => setCurrentItem({ ...currentItem, unit_price: text })}
                placeholder="Price"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>HSN Code</Text>
            <TextInput
              style={styles.input}
              value={currentItem.hsn_code}
              onChangeText={(text) => setCurrentItem({ ...currentItem, hsn_code: text })}
              placeholder="Enter HSN code (optional)"
            />
          </View>

          <TouchableOpacity style={styles.addItemButton} onPress={handleAddItem}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.addItemButtonText}>Add Item</Text>
          </TouchableOpacity>
        </View>
        </View>

        {/* Items List */}
        {formData.items.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Added Items ({formData.items.length})</Text>
            {formData.items.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <View style={styles.itemActions}>
                    <TouchableOpacity onPress={() => handleEditItem(index)}>
                      <Ionicons name="create-outline" size={20} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.itemDetail}>Size: {item.size}</Text>
                <Text style={styles.itemDetail}>
                  Quantity: {item.quantity} × ₹{item.unit_price} = ₹{item.total.toFixed(2)}
                </Text>
                {item.hsn_code && (
                  <Text style={styles.itemDetail}>HSN: {item.hsn_code}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Total Amount */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
        </View>

        {/* Submit Button */}
        <View style={styles.formActions}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled, styles.actionButtonFull]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Saving...' : 'Creating...'}
              </Text>
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Update Purchase Order' : 'Create Purchase Order'}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelButton, styles.actionButtonFull]}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  form: {
    flex: 1,
    padding: 16,
  },
  formContent: {
    paddingBottom: 32,
  },
  pageHeader: {
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  pageSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E6EAF2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#667eea',
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        height: 50,
      },
      android: {
        justifyContent: 'center',
        minHeight: 50,
      },
    }),
  },
  picker: {
    ...Platform.select({
      ios: {
        height: 50,
      },
      android: {
        height: 50,
        backgroundColor: 'transparent',
        color: '#111',
      },
    }),
    width: '100%',
  },
  dateButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  itemForm: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  addItemButton: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  addItemButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  itemsList: {
    marginBottom: 16,
  },
  itemsListTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  totalContainer: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#667eea',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#667eea',
  },
  submitButton: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  actionButtonFull: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default AddPurchaseOrderScreen;
