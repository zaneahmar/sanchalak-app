import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import PlatformPicker from '../components/PlatformPicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { paymentAPI, billingAPI, purchaseOrderAPI, customerAPI, vendorAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToaster } from '../context/ToasterContext';

const AddPaymentScreen = ({ navigation, route }) => {
  const { showToast } = useToaster();
  const [loading, setLoading] = useState(false);
  const [paymentType, setPaymentType] = useState('customer'); // 'customer' or 'vendor'
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [billings, setBillings] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [showPaymentDate, setShowPaymentDate] = useState(false);
  
  const [formData, setFormData] = useState({
    payment_type: 'customer',
    billing_id: '',
    po_id: '',
    amount: '',
    payment_method: 'cash',
    payment_date: new Date(),
    reference_number: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [paymentType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (paymentType === 'customer') {
        const [customersData, billingsData] = await Promise.all([
          customerAPI.getAll(),
          billingAPI.getAll(),
        ]);
        setCustomers(customersData || []);
        // Filter unpaid or partially paid billings
        const unpaidBillings = (billingsData || []).filter(
          (b) => b.status === 'unpaid' || b.status === 'partial'
        );
        setBillings(unpaidBillings);
      } else {
        const [vendorsData, posData] = await Promise.all([
          vendorAPI.getAll(),
          purchaseOrderAPI.getAll(),
        ]);
        setVendors(vendorsData || []);
        // Filter pending POs
        const pendingPos = (posData || []).filter(
          (po) => po.status === 'pending' || po.status === 'approved'
        );
        setPurchaseOrders(pendingPos);
      }
    } catch (error) {
      showToast('Error fetching data', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentTypeChange = (type) => {
    setPaymentType(type);
    setFormData({
      ...formData,
      payment_type: type,
      billing_id: '',
      po_id: '',
      amount: '',
    });
  };

  const handleBillingSelect = (billingId) => {
    const billing = billings.find((b) => b.id === parseInt(billingId));
    if (billing) {
      // Calculate remaining amount
      const paidAmount = parseFloat(billing.paid_amount || 0);
      const totalAmount = parseFloat(billing.total_amount ?? billing.amount ?? 0);
      const remainingAmount = totalAmount - paidAmount;
      setFormData({
        ...formData,
        billing_id: billingId,
        amount: remainingAmount.toFixed(2),
      });
    } else {
      setFormData({
        ...formData,
        billing_id: billingId,
        amount: '',
      });
    }
  };

  const handlePoSelect = (poId) => {
    const po = purchaseOrders.find((p) => p.id === parseInt(poId));
    if (po) {
      // Calculate remaining amount
      const paidAmount = po.paid_amount || 0;
      const remainingAmount = parseFloat(po.total_amount) - parseFloat(paidAmount);
      setFormData({
        ...formData,
        po_id: poId,
        amount: remainingAmount.toFixed(2),
      });
    } else {
      setFormData({
        ...formData,
        po_id: poId,
        amount: '',
      });
    }
  };

  const handleSubmit = async () => {
    if (paymentType === 'customer' && !formData.billing_id) {
      showToast('Please select an invoice', 'error');
      return;
    }

    if (paymentType === 'vendor' && !formData.po_id) {
      showToast('Please select a purchase order', 'error');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    const paymentData = {
      payment_type: paymentType,
      amount: parseFloat(formData.amount),
      payment_method: formData.payment_method,
      payment_date: formData.payment_date.toISOString().split('T')[0],
      reference_number: formData.reference_number || null,
      notes: formData.notes || null,
    };

    if (paymentType === 'customer') {
      paymentData.billing_id = parseInt(formData.billing_id);
    } else {
      paymentData.po_id = parseInt(formData.po_id);
    }

    try {
      setLoading(true);
      await paymentAPI.create(paymentData);
      showToast('Payment recorded successfully', 'success');
      navigation.goBack();
    } catch (error) {
      showToast(error.message || 'Error recording payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && customers.length === 0 && vendors.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.form}>
        {/* Payment Type Selection */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              paymentType === 'customer' && styles.typeButtonActive,
            ]}
            onPress={() => handlePaymentTypeChange('customer')}
          >
            <Ionicons
              name="person-outline"
              size={24}
              color={paymentType === 'customer' ? '#fff' : '#007AFF'}
            />
            <Text
              style={[
                styles.typeButtonText,
                paymentType === 'customer' && styles.typeButtonTextActive,
              ]}
            >
              Customer Payment
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              paymentType === 'vendor' && styles.typeButtonActive,
            ]}
            onPress={() => handlePaymentTypeChange('vendor')}
          >
            <Ionicons
              name="briefcase-outline"
              size={24}
              color={paymentType === 'vendor' ? '#fff' : '#007AFF'}
            />
            <Text
              style={[
                styles.typeButtonText,
                paymentType === 'vendor' && styles.typeButtonTextActive,
              ]}
            >
              Vendor Payment
            </Text>
          </TouchableOpacity>
        </View>

        {/* Customer Payment Fields */}
        {paymentType === 'customer' && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Invoice *</Text>
              <PlatformPicker
                selectedValue={formData.billing_id}
                onValueChange={handleBillingSelect}
                items={billings.map((billing) => ({
                  label: `Invoice #${billing.invoice_number} - ${billing.customer_name} - ₹${billing.total_amount}`,
                  value: billing.id,
                }))}
                placeholder="Select Invoice"
                wrapperStyle={styles.pickerContainer}
                pickerStyle={styles.picker}
                modalTitle="Select Invoice"
              />
              {billings.length === 0 && (
                <Text style={styles.helperText}>
                  No unpaid invoices available
                </Text>
              )}
            </View>
          </>
        )}

        {/* Vendor Payment Fields */}
        {paymentType === 'vendor' && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Purchase Order *</Text>
              <PlatformPicker
                selectedValue={formData.po_id}
                onValueChange={handlePoSelect}
                items={purchaseOrders.map((po) => ({
                  label: `PO #${po.po_number} - ${po.vendor_name} - ₹${po.total_amount}`,
                  value: po.id,
                }))}
                placeholder="Select Purchase Order"
                wrapperStyle={styles.pickerContainer}
                pickerStyle={styles.picker}
                modalTitle="Select Purchase Order"
              />
              {purchaseOrders.length === 0 && (
                <Text style={styles.helperText}>
                  No pending purchase orders available
                </Text>
              )}
            </View>
          </>
        )}

        {/* Amount */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount *</Text>
          <TextInput
            style={styles.input}
            value={formData.amount}
            onChangeText={(text) => setFormData({ ...formData, amount: text })}
            placeholder="Enter amount"
            keyboardType="decimal-pad"
          />
          <Text style={styles.helperText}>
            Enter the amount being paid
          </Text>
        </View>

        {/* Payment Method */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Payment Method *</Text>
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

        {/* Payment Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Payment Date *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowPaymentDate(true)}
          >
            <Text style={styles.dateText}>
              {formData.payment_date.toLocaleDateString()}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
          {showPaymentDate && (
            <DateTimePicker
              value={formData.payment_date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowPaymentDate(false);
                if (selectedDate) {
                  setFormData({ ...formData, payment_date: selectedDate });
                }
              }}
            />
          )}
        </View>

        {/* Reference Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Reference Number</Text>
          <TextInput
            style={styles.input}
            value={formData.reference_number}
            onChangeText={(text) => setFormData({ ...formData, reference_number: text })}
            placeholder="Transaction ID / Cheque No. (optional)"
          />
          <Text style={styles.helperText}>
            Enter transaction reference for tracking
          </Text>
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

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.submitButtonText}>Recording...</Text>
          ) : (
            <Text style={styles.submitButtonText}>Record Payment</Text>
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
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 8,
    textAlign: 'center',
  },
  typeButtonTextActive: {
    color: '#fff',
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
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        height: 50,
      },
      android: {
        justifyContent: 'center',
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
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
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

export default AddPaymentScreen;
