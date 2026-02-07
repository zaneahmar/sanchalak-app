import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { debitCreditAPI, customerAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToaster } from '../context/ToasterContext';
import PlatformPicker from '../components/PlatformPicker';

const CUSTOMER_DEBIT_REASONS = [
  { label: '-- Select Reason --', value: '' },
  { label: 'Late Payment Charge', value: 'Late Payment Charge' },
  { label: 'Service Charge', value: 'Service Charge' },
  { label: 'Interest', value: 'Interest' },
  { label: 'Price Adjustment (Increase)', value: 'Price Adjustment' },
  { label: 'Additional Charges', value: 'Additional Charges' },
  { label: 'Freight Charges', value: 'Freight Charges' },
  { label: 'Packing Charges', value: 'Packing Charges' },
  { label: 'Other', value: 'Other' },
];

const CUSTOMER_CREDIT_REASONS = [
  { label: '-- Select Reason --', value: '' },
  { label: 'Return (Goods Returned)', value: 'Return' },
  { label: 'Damaged Goods', value: 'Damaged Goods' },
  { label: 'Defective Product', value: 'Defective Product' },
  { label: 'Overcharge Correction', value: 'Overcharge' },
  { label: 'Discount / Rebate', value: 'Discount' },
  { label: 'Price Adjustment (Decrease)', value: 'Price Adjustment' },
  { label: 'Quality Issue', value: 'Quality Issue' },
  { label: 'Short Shipment', value: 'Short Shipment' },
  { label: 'Other', value: 'Other' },
];

const CustomerDebitCreditScreen = ({ route, navigation }) => {
  const { customerId } = route.params;
  const [customer, setCustomer] = useState(null);
  const [balance, setBalance] = useState(null);
  const [debitNotes, setDebitNotes] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('balance'); // 'balance', 'debit', 'credit'
  const [showDebitForm, setShowDebitForm] = useState(false);
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [showBalanceForm, setShowBalanceForm] = useState(false);
  const [debitFormData, setDebitFormData] = useState({
    reason: '',
    amount: '',
    description: '',
    billing_id: '',
  });
  const [creditFormData, setCreditFormData] = useState({
    reason: '',
    amount: '',
    description: '',
    billing_id: '',
  });
  const [balanceFormData, setBalanceFormData] = useState({
    opening_balance: '',
  });
  const { showToast } = useToaster();

  useEffect(() => {
    loadData();
  }, [customerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customerData, balanceData, debitData, creditData] = await Promise.all([
        customerAPI.getById(customerId),
        debitCreditAPI.getCustomerBalance(customerId),
        debitCreditAPI.getCustomerDebitNotes(customerId),
        debitCreditAPI.getCustomerCreditNotes(customerId),
      ]);

      const invoicesData = await debitCreditAPI.getCustomerInvoices(customerId).catch(() => []);

      setCustomer(customerData);
      setBalance(balanceData);
      setDebitNotes(debitData || []);
      setCreditNotes(creditData || []);
      setInvoices(invoicesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [customerId]);

  const formatCurrency = (value) => {
    const numberValue = parseFloat(value || 0);
    if (Number.isNaN(numberValue)) return '0.00';
    return numberValue.toFixed(2);
  };

  const handleCreateDebit = async () => {
    if (!debitFormData.reason || !debitFormData.amount) {
      showToast('Reason and amount are required', 'error');
      return;
    }

    try {
      await debitCreditAPI.createCustomerDebitNote({
        customer_id: Number(customerId),
        reason: debitFormData.reason,
        amount: parseFloat(debitFormData.amount),
        description: debitFormData.description,
        billing_id: debitFormData.billing_id ? Number(debitFormData.billing_id) : null,
        created_by: 'mobile',
      });

      showToast('Debit note created', 'success');
      setDebitFormData({ reason: '', amount: '', description: '', billing_id: '' });
      setShowDebitForm(false);
      loadData();
    } catch (error) {
      showToast('Failed to create debit note', 'error');
    }
  };

  const handleCreateCredit = async () => {
    if (!creditFormData.reason || !creditFormData.amount) {
      showToast('Reason and amount are required', 'error');
      return;
    }

    try {
      await debitCreditAPI.createCustomerCreditNote({
        customer_id: Number(customerId),
        reason: creditFormData.reason,
        amount: parseFloat(creditFormData.amount),
        description: creditFormData.description,
        billing_id: creditFormData.billing_id ? Number(creditFormData.billing_id) : null,
        created_by: 'mobile',
      });

      showToast('Credit note created', 'success');
      setCreditFormData({ reason: '', amount: '', description: '', billing_id: '' });
      setShowCreditForm(false);
      loadData();
    } catch (error) {
      showToast('Failed to create credit note', 'error');
    }
  };

  const handleUpdateBalance = async () => {
    if (!balanceFormData.opening_balance) {
      showToast('Opening balance is required', 'error');
      return;
    }

    try {
      await debitCreditAPI.updateCustomerBalance(customerId, {
        opening_balance: parseFloat(balanceFormData.opening_balance),
      });
      showToast('Balance updated', 'success');
      setShowBalanceForm(false);
      setBalanceFormData({ opening_balance: '' });
      loadData();
    } catch (error) {
      showToast('Failed to update balance', 'error');
    }
  };

  const handleApproveDebit = async (debitNoteId) => {
    Alert.alert(
      'Approve Debit Note',
      'Are you sure you want to approve this debit note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await debitCreditAPI.approveCustomerDebitNote(debitNoteId);
              showToast('Debit note approved', 'success');
              loadData();
            } catch (error) {
              showToast('Failed to approve debit note', 'error');
            }
          },
        },
      ]
    );
  };

  const handleCancelDebit = async (debitNoteId) => {
    Alert.alert(
      'Cancel Debit Note',
      'Are you sure you want to cancel this debit note?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await debitCreditAPI.cancelCustomerDebitNote(debitNoteId);
              showToast('Debit note cancelled', 'success');
              loadData();
            } catch (error) {
              showToast('Failed to cancel debit note', 'error');
            }
          },
        },
      ]
    );
  };

  const handleApproveCredit = async (creditNoteId) => {
    Alert.alert(
      'Approve Credit Note',
      'Are you sure you want to approve this credit note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await debitCreditAPI.approveCustomerCreditNote(creditNoteId);
              showToast('Credit note approved', 'success');
              loadData();
            } catch (error) {
              showToast('Failed to approve credit note', 'error');
            }
          },
        },
      ]
    );
  };

  const handleCancelCredit = async (creditNoteId) => {
    Alert.alert(
      'Cancel Credit Note',
      'Are you sure you want to cancel this credit note?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await debitCreditAPI.cancelCustomerCreditNote(creditNoteId);
              showToast('Credit note cancelled', 'success');
              loadData();
            } catch (error) {
              showToast('Failed to cancel credit note', 'error');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return '#34C759';
      case 'pending':
        return '#FF9500';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#999';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {/* Customer Info Header */}
      {customer && (
        <View style={styles.header}>
          <Text style={styles.customerName}>{customer.name}</Text>
          {customer.email && (
            <Text style={styles.customerEmail}>{customer.email}</Text>
          )}
        </View>
      )}

      {/* Tab Navigation */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'balance' && styles.activeTab]}
          onPress={() => setActiveTab('balance')}
        >
          <Text style={[styles.tabText, activeTab === 'balance' && styles.activeTabText]}>
            Balance
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'debit' && styles.activeTab]}
          onPress={() => setActiveTab('debit')}
        >
          <Text style={[styles.tabText, activeTab === 'debit' && styles.activeTabText]}>
            Debit Notes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'credit' && styles.activeTab]}
          onPress={() => setActiveTab('credit')}
        >
          <Text style={[styles.tabText, activeTab === 'credit' && styles.activeTabText]}>
            Credit Notes
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Balance Tab */}
        {activeTab === 'balance' && balance && (
          <View style={styles.balanceContainer}>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text
                style={[
                  styles.balanceAmount,
                  { color: balance.balance < 0 ? '#FF3B30' : '#34C759' },
                ]}
              >
                ₹{formatCurrency(Math.abs(balance.balance || 0))}
              </Text>
              <Text style={styles.balanceSubtext}>
                {balance.balance < 0 ? 'Amount Due' : 'Credit Balance'}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Opening Balance</Text>
                <Text style={styles.summaryValue}>
                  ₹{formatCurrency(balance.opening_balance || 0)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Debit</Text>
                <Text style={[styles.summaryValue, { color: '#FF3B30' }]}>
                  ₹{formatCurrency(balance.total_debit || 0)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Credit</Text>
                <Text style={[styles.summaryValue, { color: '#34C759' }]}>
                  ₹{formatCurrency(balance.total_credit || 0)}
                </Text>
              </View>
            </View>

            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Opening Balance</Text>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setShowBalanceForm((prev) => !prev)}
                >
                  <Text style={styles.secondaryButtonText}>
                    {showBalanceForm ? 'Cancel' : 'Update'}
                  </Text>
                </TouchableOpacity>
              </View>
              {showBalanceForm && (
                <View style={styles.formBody}>
                  <Text style={styles.inputLabel}>Opening Balance</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter opening balance"
                    keyboardType="decimal-pad"
                    value={balanceFormData.opening_balance}
                    onChangeText={(text) =>
                      setBalanceFormData({ opening_balance: text })
                    }
                  />
                  <TouchableOpacity style={styles.primaryAction} onPress={handleUpdateBalance}>
                    <Text style={styles.primaryActionText}>Save Balance</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Debit Notes Tab */}
        {activeTab === 'debit' && (
          <View>
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Create Debit Note</Text>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setShowDebitForm((prev) => !prev)}
                >
                  <Text style={styles.secondaryButtonText}>
                    {showDebitForm ? 'Cancel' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>
              {showDebitForm && (
                <View style={styles.formBody}>
                  <Text style={styles.inputLabel}>Reason</Text>
                  <PlatformPicker
                    selectedValue={debitFormData.reason}
                    onValueChange={(value) =>
                      setDebitFormData((prev) => ({ ...prev, reason: value }))
                    }
                    items={CUSTOMER_DEBIT_REASONS}
                    placeholder={null}
                    wrapperStyle={styles.pickerWrapper}
                    pickerStyle={styles.picker}
                    modalTitle="Reason"
                  />
                  <Text style={styles.inputLabel}>Invoice (Optional)</Text>
                  <PlatformPicker
                    selectedValue={debitFormData.billing_id}
                    onValueChange={(value) =>
                      setDebitFormData((prev) => ({ ...prev, billing_id: value }))
                    }
                    items={[
                      { label: '-- Select Invoice --', value: '' },
                      ...(invoices || []).map((invoice) => ({
                        label: `#${invoice.invoice_number || invoice.id} • ₹${formatCurrency(invoice.total_amount)}`,
                        value: invoice.id,
                      })),
                    ]}
                    placeholder={null}
                    wrapperStyle={styles.pickerWrapper}
                    pickerStyle={styles.picker}
                    modalTitle="Invoice"
                  />
                  <Text style={styles.inputLabel}>Amount</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount"
                    keyboardType="decimal-pad"
                    value={debitFormData.amount}
                    onChangeText={(text) =>
                      setDebitFormData((prev) => ({ ...prev, amount: text }))
                    }
                  />
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Add description"
                    value={debitFormData.description}
                    onChangeText={(text) =>
                      setDebitFormData((prev) => ({ ...prev, description: text }))
                    }
                    multiline
                    numberOfLines={3}
                  />
                  <TouchableOpacity style={styles.primaryAction} onPress={handleCreateDebit}>
                    <Text style={styles.primaryActionText}>Create Debit Note</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {debitNotes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No debit notes found</Text>
              </View>
            ) : (
              debitNotes.map((note) => (
                <View key={note.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>DN-{note.id}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(note.status) },
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {note.status?.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.cardReason}>{note.reason}</Text>
                    <Text style={styles.cardAmount}>₹{formatCurrency(note.amount)}</Text>
                    <Text style={styles.cardDate}>
                      {new Date(note.created_at).toLocaleDateString()}
                    </Text>
                    {note.billing_id && (
                      <Text style={styles.cardMeta}>Invoice: #{note.billing_id}</Text>
                    )}
                    {note.description && (
                      <Text style={styles.cardDescription}>{note.description}</Text>
                    )}
                  </View>

                  {note.status === 'pending' && (
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleApproveDebit(note.id)}
                      >
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.cancelButton]}
                        onPress={() => handleCancelDebit(note.id)}
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* Credit Notes Tab */}
        {activeTab === 'credit' && (
          <View>
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Create Credit Note</Text>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setShowCreditForm((prev) => !prev)}
                >
                  <Text style={styles.secondaryButtonText}>
                    {showCreditForm ? 'Cancel' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>
              {showCreditForm && (
                <View style={styles.formBody}>
                  <Text style={styles.inputLabel}>Reason</Text>
                  <PlatformPicker
                    selectedValue={creditFormData.reason}
                    onValueChange={(value) =>
                      setCreditFormData((prev) => ({ ...prev, reason: value }))
                    }
                    items={CUSTOMER_CREDIT_REASONS}
                    placeholder={null}
                    wrapperStyle={styles.pickerWrapper}
                    pickerStyle={styles.picker}
                    modalTitle="Reason"
                  />
                  <Text style={styles.inputLabel}>Invoice (Optional)</Text>
                  <PlatformPicker
                    selectedValue={creditFormData.billing_id}
                    onValueChange={(value) =>
                      setCreditFormData((prev) => ({ ...prev, billing_id: value }))
                    }
                    items={[
                      { label: '-- Select Invoice --', value: '' },
                      ...(invoices || []).map((invoice) => ({
                        label: `#${invoice.invoice_number || invoice.id} • ₹${formatCurrency(invoice.total_amount)}`,
                        value: invoice.id,
                      })),
                    ]}
                    placeholder={null}
                    wrapperStyle={styles.pickerWrapper}
                    pickerStyle={styles.picker}
                    modalTitle="Invoice"
                  />
                  <Text style={styles.inputLabel}>Amount</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount"
                    keyboardType="decimal-pad"
                    value={creditFormData.amount}
                    onChangeText={(text) =>
                      setCreditFormData((prev) => ({ ...prev, amount: text }))
                    }
                  />
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Add description"
                    value={creditFormData.description}
                    onChangeText={(text) =>
                      setCreditFormData((prev) => ({ ...prev, description: text }))
                    }
                    multiline
                    numberOfLines={3}
                  />
                  <TouchableOpacity style={styles.primaryAction} onPress={handleCreateCredit}>
                    <Text style={styles.primaryActionText}>Create Credit Note</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {creditNotes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No credit notes found</Text>
              </View>
            ) : (
              creditNotes.map((note) => (
                <View key={note.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>CN-{note.id}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(note.status) },
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {note.status?.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.cardReason}>{note.reason}</Text>
                    <Text style={styles.cardAmount}>₹{formatCurrency(note.amount)}</Text>
                    <Text style={styles.cardDate}>
                      {new Date(note.created_at).toLocaleDateString()}
                    </Text>
                    {note.billing_id && (
                      <Text style={styles.cardMeta}>Invoice: #{note.billing_id}</Text>
                    )}
                    {note.description && (
                      <Text style={styles.cardDescription}>{note.description}</Text>
                    )}
                  </View>

                  {note.status === 'pending' && (
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleApproveCredit(note.id)}
                      >
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.cancelButton]}
                        onPress={() => handleCancelCredit(note.id)}
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 16,
    paddingBottom: 20,
  },
  customerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  balanceContainer: {
    marginBottom: 16,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  balanceSubtext: {
    fontSize: 12,
    color: '#999',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  summaryItem: {
    flexGrow: 1,
    flexBasis: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    minWidth: 140,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  formBody: {
    marginTop: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    marginBottom: 12,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: 12,
    minHeight: 44,
  },
  picker: {
    height: 44,
    width: '100%',
    color: '#111',
  },
  primaryAction: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardBody: {
    marginBottom: 12,
  },
  cardReason: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  cardAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  cardMeta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});

export default CustomerDebitCreditScreen;
