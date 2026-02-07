import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import PlatformPicker from '../components/PlatformPicker';
import { Ionicons } from '@expo/vector-icons';
import { DataContext } from '../context/DataContext';
import { useToaster } from '../context/ToasterContext';
import { productAPI, purchaseOrderAPI } from '../services/api';

const AddProductScreen = ({ navigation }) => {
  const { addProduct, fetchProducts } = useContext(DataContext);
  const { showToast } = useToaster();
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [purchasedProducts, setPurchasedProducts] = useState([]);
  const [selectedPurchasedProduct, setSelectedPurchasedProduct] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cost: '',
    sku: '',
    size: '',
    color: '',
    hsn_code: '',
    stock_quantity: '',
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    try {
      const [inventoryData, dropdownProducts] = await Promise.all([
        productAPI.getAll(), 
        purchaseOrderAPI.getDropdownProducts(),
      ]);
      setInventory(inventoryData || []);
      const formattedDropdown = (dropdownProducts || []).map((item, index) => ({
        id: `${item.product_name || 'product'}-${index}`,
        name: item.product_name || `Product ${index + 1}`,
        size: item.size || '',
        cost: parseFloat(item.unit_price) || 0,
        stock: parseInt(item.quantity || 0, 10),
        hsn_code: item.hsn_code || '',
      }));
      setPurchasedProducts(formattedDropdown);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleProductSelect = (productId) => {
    setSelectedPurchasedProduct(productId || '');
    if (!productId) {
      setFormData(prev => ({
        ...prev,
        name: '',
        cost: '',
        stock_quantity: '',
        hsn_code: '',
      }));
      return;
    }
    const product = purchasedProducts.find(p => p.id === productId);
    if (product) {
      setFormData(prev => ({
        ...prev,
        name: product.name,
        cost: product.cost?.toString() || '',
        stock_quantity: product.stock?.toString() || '',
        hsn_code: product.hsn_code || '',
        size: prev.size || product.size || '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    
    if (!formData.price || isNaN(parseFloat(formData.price))) {
      newErrors.price = 'Valid price is required';
    } else if (parseFloat(formData.price) < 0) {
      newErrors.price = 'Price cannot be negative';
    }
    
    if (!formData.cost || isNaN(parseFloat(formData.cost))) {
      newErrors.cost = 'Cost price is required';
    } else if (parseFloat(formData.cost) < 0) {
      newErrors.cost = 'Cost cannot be negative';
    }
    
    if (formData.stock_quantity === '' || isNaN(parseInt(formData.stock_quantity))) {
      newErrors.stock_quantity = 'Stock quantity is required';
    } else if (parseInt(formData.stock_quantity) < 0) {
      newErrors.stock_quantity = 'Stock quantity cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : 0,
        sku: formData.sku.trim(), 
        category: formData.size.trim() || 'General', 
        color: formData.color.trim(),
        hsn_code: formData.hsn_code.trim(),
        stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : 0,
      };
      
      await addProduct(productData);
      await fetchProducts();
      showToast('Inventory item added successfully!', 'success');
      setSelectedPurchasedProduct('');
      navigation.goBack();
    } catch (error) {
      console.error('Error adding product:', error);
      showToast(error.message || 'Failed to add inventory item', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Add Inventory</Text>
          <Text style={styles.pageSubtitle}>Add a new item to your inventory</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Product Name <Text style={styles.required}>*</Text>
            </Text>
            <PlatformPicker
              selectedValue={selectedPurchasedProduct}
              onValueChange={(value) => handleProductSelect(value)}
              items={purchasedProducts
                .filter((product) => !inventory.some((inv) => inv.name === product.name))
                .map((product) => ({
                  label: product.name,
                  value: product.id,
                }))}
              placeholder="-- Select a product --"
              disabled={loading}
              wrapperStyle={styles.pickerWrapper}
              pickerStyle={styles.picker}
              modalTitle="Select Product"
            />
            <Text style={styles.helperText}>Auto-fills cost, stock, and HSN</Text>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, styles.thirdWidth]}>
              <Text style={styles.label}>HSN Code</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 6401"
                value={formData.hsn_code}
                onChangeText={(value) => handleChange('hsn_code', value)}
                editable={!loading}
              />
            </View>
            <View style={[styles.formGroup, styles.thirdWidth]}>
              <Text style={styles.label}>Size</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 6-13"
                value={formData.size}
                onChangeText={(value) => handleChange('size', value)}
                editable={!loading}
              />
            </View>
            <View style={[styles.formGroup, styles.thirdWidth]}>
              <Text style={styles.label}>Color</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Black"
                value={formData.color}
                onChangeText={(value) => handleChange('color', value)}
                editable={!loading}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing & Stock</Text>
          
          <View style={styles.row}>
            <View style={[styles.formGroup, styles.thirdWidth]}>
              <Text style={styles.label}>
                Cost Price (₹) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.cost && styles.inputError]}
                placeholder="0.00"
                value={formData.cost}
                onChangeText={(value) => handleChange('cost', value)}
                keyboardType="decimal-pad"
                editable={!loading}
              />
              {errors.cost && <Text style={styles.errorText}>{errors.cost}</Text>}
            </View>

            <View style={[styles.formGroup, styles.thirdWidth]}>
              <Text style={styles.label}>
                Selling Price (₹) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.price && styles.inputError]}
                placeholder="0.00"
                value={formData.price}
                onChangeText={(value) => handleChange('price', value)}
                keyboardType="decimal-pad"
                editable={!loading}
              />
              {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
            </View>

            <View style={[styles.formGroup, styles.thirdWidth]}>
              <Text style={styles.label}>
                Stock Quantity <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.stock_quantity && styles.inputError]}
                placeholder="0"
                value={formData.stock_quantity}
                onChangeText={(value) => handleChange('stock_quantity', value)}
                keyboardType="number-pad"
                editable={!loading}
              />
              {errors.stock_quantity && (
                <Text style={styles.errorText}>{errors.stock_quantity}</Text>
              )}
            </View>
          </View>

          {formData.cost && formData.price && parseFloat(formData.cost) > 0 && parseFloat(formData.price) > 0 && (
            <View style={styles.marginInfo}>
              <Ionicons name="information-circle-outline" size={20} color="#667eea" />
              <Text style={styles.marginText}>
                Margin: ₹{(parseFloat(formData.price) - parseFloat(formData.cost)).toFixed(2)} 
                ({((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.cost) * 100).toFixed(1)}%)
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional details..."
              value={formData.description}
              onChangeText={(value) => handleChange('description', value)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Add Inventory</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
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
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E6EAF2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    color: '#111827',
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
  },
  inputMarginTop: {
    marginTop: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#667eea',
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
  inputError: {
    borderColor: '#FF3B30',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 12,
    columnGap: 12,
  },
  halfWidth: {
    flexGrow: 1,
    flexBasis: '48%',
    minWidth: 160,
  },
  thirdWidth: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 120,
  },
  marginInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  marginText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    backgroundColor: '#667eea',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default AddProductScreen;
