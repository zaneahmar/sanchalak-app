import React, { useState, useEffect } from 'react';
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
import { salesAPI, customerAPI, productAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToaster } from '../context/ToasterContext';

const AddSaleScreen = ({ navigation, route }) => {
  const { showToast } = useToaster();
  const { saleId } = route.params || {};
  const isEditMode = Boolean(saleId);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showSaleDate, setShowSaleDate] = useState(false);
  const [showDueDate, setShowDueDate] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_id: '',
    sale_date: new Date(),
    due_date: null,
    payment_method: 'cash',
    notes: '',
    items: [],
  });

  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    product_name: '',
    quantity: '',
    price: '',
    size: '',
    hsn_code: '',
  });

  const [editingIndex, setEditingIndex] = useState(null);

  const [gst, setGst] = useState({
    cgst: '9',
    sgst: '9',
    igst: '0',
  });

  const [gstPercentage, setGstPercentage] = useState('18'); // Total GST percentage

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!isEditMode || customers.length === 0 || products.length === 0) return;
    fetchSaleForEdit();
  }, [isEditMode, customers.length, products.length]);

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
      showToast('Error fetching data', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSaleForEdit = async () => {
    try {
      setLoading(true);
      const sale = await salesAPI.getById(saleId);
      if (!sale) {
        showToast('Sale not found', 'error');
        return;
      }

      const saleDate = sale.sale_date ? new Date(sale.sale_date) : new Date();
      const dueDate = sale.due_date ? new Date(sale.due_date) : null;

      const itemsArray = Array.isArray(sale.items) ? sale.items : [];
      const itemSubtotal = itemsArray.reduce((sum, item) => {
        const qty = parseFloat(item.quantity || 0);
        const price = parseFloat(item.unit_price || 0);
        return sum + qty * price;
      }, 0);

      let gstPercentValue = sale.gst_percentage ?? sale.gst_rate;
      if (!gstPercentValue || Number(gstPercentValue) <= 0) {
        const gstAmountValue = parseFloat(sale.gst_amount || 0);
        if (itemSubtotal > 0 && gstAmountValue > 0) {
          gstPercentValue = (gstAmountValue / itemSubtotal) * 100;
        } else if (itemSubtotal > 0 && sale.total_amount) {
          const total = parseFloat(sale.total_amount || 0);
          gstPercentValue = ((total - itemSubtotal) / itemSubtotal) * 100;
        } else {
          gstPercentValue = 18;
        }
      }

      const gstPercent = String(parseFloat(gstPercentValue).toFixed(2));
      const halfGst = (parseFloat(gstPercent) / 2).toString();

      setGstPercentage(gstPercent);
      setGst({ cgst: halfGst, sgst: halfGst, igst: '0' });

      const mappedItems = itemsArray.map((item) => {
        const productMatch = products.find(
          (product) => product.name === item.product_name
        );
        const quantity = parseFloat(item.quantity || 0);
        const price = parseFloat(item.unit_price || 0);
        return {
          product_id: productMatch?.id || '',
          product_name: item.product_name || productMatch?.name || 'Item',
          quantity: quantity,
          price: price,
          size: '',
          hsn_code: item.hsn_code || productMatch?.hsn_code || '',
          subtotal: quantity * price,
        };
      });

      setFormData({
        customer_id: sale.customer_id || '',
        sale_date: saleDate,
        due_date: dueDate,
        payment_method: sale.payment_method || 'cash',
        notes: sale.notes || '',
        items: mappedItems,
      });
    } catch (error) {
      console.error('Sale edit load error:', error);
      showToast('Failed to load sale for edit', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (productId) => {
    const product = products.find((p) => p.id === parseInt(productId));
    if (product) {
      setCurrentItem({
        ...currentItem,
        product_id: productId,
        product_name: product.name,
        price: product.price?.toString() || '',
        size: product.size || '',
        hsn_code: product.hsn_code || '',
      });
    } else {
      setCurrentItem({
        ...currentItem,
        product_id: productId,
        product_name: '',
        price: '',
        size: '',
        hsn_code: '',
      });
    }
  };

  const handleAddItem = () => {
    if (!currentItem.product_name || !currentItem.quantity || !currentItem.price) {
      showToast('Please fill all item fields', 'error');
      return;
    }

    if (parseFloat(currentItem.quantity) <= 0 || parseFloat(currentItem.price) <= 0) {
      showToast('Quantity and price must be greater than 0', 'error');
      return;
    }

    const newItem = {
      ...currentItem,
      quantity: parseFloat(currentItem.quantity),
      price: parseFloat(currentItem.price),
      subtotal: parseFloat(currentItem.quantity) * parseFloat(currentItem.price),
    };

    setFormData((prev) => {
      if (editingIndex !== null) {
        const updatedItems = [...prev.items];
        updatedItems[editingIndex] = newItem;
        return { ...prev, items: updatedItems };
      }
      return { ...prev, items: [...prev.items, newItem] };
    });

    setCurrentItem({
      product_id: '',
      product_name: '',
      quantity: '',
      price: '',
      size: '',
      hsn_code: '',
    });

    setEditingIndex(null);

    showToast(editingIndex !== null ? 'Item updated' : 'Item added', 'success');
  };

  const handleEditItem = (index) => {
    const item = formData.items[index];
    if (!item) return;
    setEditingIndex(index);
    setCurrentItem({
      product_id: item.product_id || '',
      product_name: item.product_name || '',
      quantity: item.quantity?.toString() || '',
      price: item.price?.toString() || '',
      size: item.size || '',
      hsn_code: item.hsn_code || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setCurrentItem({
      product_id: '',
      product_name: '',
      quantity: '',
      price: '',
      size: '',
      hsn_code: '',
    });
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

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Use gstPercentage for calculation (split equally between CGST and SGST if not interstate)
    const totalGstRate = parseFloat(gstPercentage);
    const gstAmount = (subtotal * totalGstRate) / 100;
    
    // For display purposes, split into CGST/SGST
    const cgstAmount = (subtotal * parseFloat(gst.cgst)) / 100;
    const sgstAmount = (subtotal * parseFloat(gst.sgst)) / 100;
    const igstAmount = (subtotal * parseFloat(gst.igst)) / 100;
    const totalGst = cgstAmount + sgstAmount + igstAmount;
    const totalAmount = subtotal + gstAmount;

    return {
      subtotal,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalGst,
      totalAmount,
    };
  };

  const handleSubmit = async () => {
    if (!formData.customer_id) {
      showToast('Please select a customer', 'error');
      return;
    }

    if (formData.items.length === 0) {
      showToast('Please add at least one item', 'error');
      return;
    }

    const totals = calculateTotals();

    const mappedItems = formData.items.map((item) => {
      let productId = item.product_id;
      if (!productId && item.product_name) {
        const productMatch = products.find(
          (product) => product.name === item.product_name
        );
        productId = productMatch?.id || '';
      }
      if (!productId) {
        throw new Error(`Product not found for item: ${item.product_name || 'Unknown'}`);
      }
      return {
        productId: Number(productId),
        quantity: Number(item.quantity) || 0,
        price: Number(item.price) || 0,
      };
    });

    const saleData = {
      customerId: formData.customer_id || null,
      saleDate: formData.sale_date.toISOString(),
      dueDate: formData.due_date ? formData.due_date.toISOString() : null,
      paymentMethod: formData.payment_method,
      notes: formData.notes,
      items: mappedItems,
      subtotal: totals.subtotal,
      gstPercentage: parseFloat(gstPercentage) || 0,
      gstAmount: totals.totalGst,
      totalAmount: totals.totalAmount,
    };

    try {
      setLoading(true);
      if (isEditMode) {
        await salesAPI.update(saleId, saleData);
        showToast('Sale updated successfully', 'success');
      } else {
        await salesAPI.create(saleData);
        showToast('Sale created successfully', 'success');
      }
      navigation.goBack();
    } catch (error) {
      showToast(error.message || 'Error saving sale', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  if (loading && customers.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.form}>
        {/* Customer Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Customer *</Text>
          <PlatformPicker
            selectedValue={formData.customer_id}
            onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
            items={customers.map((customer) => ({
              label: customer.name,
              value: customer.id,
            }))}
            placeholder="-- Select Customer --"
            wrapperStyle={styles.pickerWrapper}
            pickerStyle={styles.picker}
            modalTitle="Select Customer"
          />
        </View>

        {/* Sale Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Sale Date *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowSaleDate(true)}
          >
            <Text style={styles.dateText}>
              {formData.sale_date.toLocaleDateString()}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
          {showSaleDate && (
            <DateTimePicker
              value={formData.sale_date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowSaleDate(false);
                if (selectedDate) {
                  setFormData({ ...formData, sale_date: selectedDate });
                }
              }}
            />
          )}
        </View>

        {/* Due Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Due Date (Optional)</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDueDate(true)}
          >
            <Text style={styles.dateText}>
              {formData.due_date ? formData.due_date.toLocaleDateString() : 'Select due date'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
          {showDueDate && (
            <DateTimePicker
              value={formData.due_date || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDueDate(false);
                if (selectedDate) {
                  setFormData({ ...formData, due_date: selectedDate });
                }
              }}
            />
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Payment Method</Text>
          <PlatformPicker
            selectedValue={formData.payment_method}
            onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
            items={[
              { label: 'Cash', value: 'cash' },
              { label: 'Card', value: 'card' },
              { label: 'UPI', value: 'upi' },
              { label: 'Bank Transfer', value: 'bank_transfer' },
              { label: 'Cheque', value: 'cheque' },
            ]}
            placeholder={null}
            wrapperStyle={styles.pickerContainer}
            pickerStyle={styles.picker}
            modalTitle="Payment Method"
          />
        </View>

        {/* GST Percentage */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>GST Percentage</Text>
          <PlatformPicker
            selectedValue={gstPercentage}
            onValueChange={(value) => {
              setGstPercentage(value);
              // Auto-split GST into CGST and SGST for intrastate (can be adjusted for interstate)
              const half = (parseFloat(value) / 2).toString();
              setGst({
                cgst: half,
                sgst: half,
                igst: '0',
              });
            }}
            items={[
              { label: '0%', value: '0' },
              { label: '5%', value: '5' },
              { label: '12%', value: '12' },
              { label: '18%', value: '18' },
              { label: '28%', value: '28' },
            ]}
            placeholder={null}
            wrapperStyle={styles.pickerContainer}
            pickerStyle={styles.picker}
            modalTitle="GST Percentage"
          />
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

        {/* GST Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>GST Details</Text>
        </View>
        <View style={styles.gstContainer}>
          <View style={styles.gstRow}>
            <View style={[styles.inputGroup, styles.gstInput]}>
              <Text style={styles.label}>CGST (%)</Text>
              <TextInput
                style={styles.input}
                value={gst.cgst}
                onChangeText={(text) => setGst({ ...gst, cgst: text })}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.inputGroup, styles.gstInput]}>
              <Text style={styles.label}>SGST (%)</Text>
              <TextInput
                style={styles.input}
                value={gst.sgst}
                onChangeText={(text) => setGst({ ...gst, sgst: text })}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.inputGroup, styles.gstInput]}>
              <Text style={styles.label}>IGST (%)</Text>
              <TextInput
                style={styles.input}
                value={gst.igst}
                onChangeText={(text) => setGst({ ...gst, igst: text })}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* Items Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Items</Text>
        </View>

        {/* Add Item Form */}
        <View style={styles.itemForm}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Product</Text>
            <PlatformPicker
              selectedValue={currentItem.product_id}
              onValueChange={handleProductSelect}
              items={products
                .filter((product) => {
                  // Only show products with stock available
                  const stock = product.stock_quantity || product.stock || 0;
                  return stock > 0;
                })
                .map((product) => {
                  const stock = product.stock_quantity || product.stock || 0;
                  return {
                    label: `${product.name} (${stock} in stock) - ₹${product.price}`,
                    value: product.id,
                  };
                })}
              placeholder="Select Product"
              wrapperStyle={styles.pickerContainer}
              pickerStyle={styles.picker}
              modalTitle="Select Product"
            />
          </View>

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
            <Text style={styles.label}>Size</Text>
            <TextInput
              style={styles.input}
              value={currentItem.size}
              onChangeText={(text) => setCurrentItem({ ...currentItem, size: text })}
              placeholder="Enter size (optional)"
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
              <Text style={styles.label}>Price *</Text>
              <TextInput
                style={styles.input}
                value={currentItem.price}
                onChangeText={(text) => setCurrentItem({ ...currentItem, price: text })}
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
            <Ionicons
              name={editingIndex !== null ? 'checkmark-circle-outline' : 'add-circle-outline'}
              size={20}
              color="#fff"
            />
            <Text style={styles.addItemButtonText}>
              {editingIndex !== null ? 'Update Item' : 'Add Item'}
            </Text>
          </TouchableOpacity>
          {editingIndex !== null && (
            <TouchableOpacity style={styles.cancelEditButton} onPress={handleCancelEdit}>
              <Ionicons name="close-circle-outline" size={18} color="#FF3B30" />
              <Text style={styles.cancelEditButtonText}>Cancel Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Items List */}
        {formData.items.length > 0 && (
          <View style={styles.itemsList}>
            <Text style={styles.itemsListTitle}>Added Items ({formData.items.length})</Text>
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
                {item.size && <Text style={styles.itemDetail}>Size: {item.size}</Text>}
                <Text style={styles.itemDetail}>
                  Quantity: {item.quantity} × ₹{item.price} = ₹{item.subtotal.toFixed(2)}
                </Text>
                {item.hsn_code && (
                  <Text style={styles.itemDetail}>HSN: {item.hsn_code}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Total Summary */}
        {formData.items.length > 0 && (
          <View style={styles.totalSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>₹{totals.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>CGST ({gst.cgst}%):</Text>
              <Text style={styles.summaryValue}>₹{totals.cgstAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>SGST ({gst.sgst}%):</Text>
              <Text style={styles.summaryValue}>₹{totals.sgstAmount.toFixed(2)}</Text>
            </View>
            {parseFloat(gst.igst) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>IGST ({gst.igst}%):</Text>
                <Text style={styles.summaryValue}>₹{totals.igstAmount.toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalValue}>₹{totals.totalAmount.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.submitButtonText}>
              {isEditMode ? 'Updating...' : 'Creating...'}
            </Text>
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditMode ? 'Update Sale' : 'Create Sale'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 50,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  gstContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  gstRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  gstInput: {
    flex: 1,
    marginBottom: 0,
  },
  itemForm: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
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
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  cancelEditButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
    backgroundColor: '#fff',
  },
  cancelEditButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
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
    gap: 10,
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
  totalSummary: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  submitButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default AddSaleScreen;
