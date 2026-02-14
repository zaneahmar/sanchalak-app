import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { paymentAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToaster } from '../context/ToasterContext';
import PlatformPicker from '../components/PlatformPicker';
import theme from '../styles/theme';

const PaymentsScreen = ({ navigation }) => {
  const [payments, setPayments] = useState([]);
  const [duesSummary, setDuesSummary] = useState([]);
  const [overdueDues, setOverdueDues] = useState([]);
  const [activeTab, setActiveTab] = useState('payments');
  const [filters, setFilters] = useState({
    status: '',
    method: '',
    searchTerm: '',
    invoiceNumber: '',
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToaster();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentsData, duesData, overdueData] = await Promise.all([
        paymentAPI.getAll(),
        paymentAPI.getDuesSummary(),
        paymentAPI.getOverdueDues(7),
      ]);
      setPayments(paymentsData || []);
      setDuesSummary(duesData || []);
      setOverdueDues(overdueData || []);
    } catch (error) {
      showToast('Error fetching payment data', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const getPaymentTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'customer':
        return theme.colors.secondary;
      case 'vendor':
        return theme.colors.warning;
      default:
        return theme.colors.primary;
    }
  };

  const getPaymentType = (payment) => {
    if (!payment) return 'N/A';
    if (payment.payment_type) return payment.payment_type;
    if (payment.billing_id) return 'customer';
    if (payment.po_id) return 'vendor';
    if (payment.customer_name) return 'customer';
    if (payment.vendor_name) return 'vendor';
    return 'N/A';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const totalPayments = payments.reduce(
    (sum, p) => sum + parseFloat(p.amount || 0),
    0
  );
  const customerDues = duesSummary.find((d) => d.type === 'customer_dues');
  const vendorDues = duesSummary.find((d) => d.type === 'vendor_dues');

  const filteredPayments = payments.filter((payment) => {
    if (filters.status && payment.status !== filters.status) return false;
    if (filters.method && payment.payment_method !== filters.method) return false;
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      const customerName = (payment.customer_name || '').toLowerCase();
      const vendorName = (payment.vendor_name || '').toLowerCase();
      if (!customerName.includes(search) && !vendorName.includes(search)) return false;
    }
    if (filters.invoiceNumber) {
      const invoiceSearch = filters.invoiceNumber.toLowerCase();
      const invoiceNumber = (payment.invoice_number || '').toLowerCase();
      const poNumber = (payment.po_number || '').toLowerCase();
      if (!invoiceNumber.includes(invoiceSearch) && !poNumber.includes(invoiceSearch)) return false;
    }
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Payment & Dues Management</Text>
          <Text style={styles.heroSubtitle}>Track payments and outstanding dues</Text>
        </View>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('AddPayment')}
        >
          <Ionicons name="add" size={18} color={theme.colors.white} />
          <Text style={styles.primaryButtonText}>Record Payment</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        {[
          { id: 'payments', label: 'Payments' },
          { id: 'dues', label: 'Dues' },
          { id: 'overdue', label: 'Overdue' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'payments' && (
          <>
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, styles.summaryPrimary]}>
                <Text style={styles.summaryLabel}>Total Payments</Text>
                <Text style={styles.summaryValue}>₹{totalPayments.toFixed(2)}</Text>
                <Text style={styles.summarySubText}>{payments.length} transactions</Text>
              </View>
              <View style={[styles.summaryCard, styles.summaryWarning]}>
                <Text style={styles.summaryLabel}>Customer Dues</Text>
                <Text style={styles.summaryValue}>
                  ₹{parseFloat(customerDues?.total_dues || 0).toFixed(2)}
                </Text>
                <Text style={styles.summarySubText}>{customerDues?.count || 0} customers</Text>
              </View>
              <View style={[styles.summaryCard, styles.summaryDanger]}>
                <Text style={styles.summaryLabel}>Vendor Dues</Text>
                <Text style={styles.summaryValue}>
                  ₹{parseFloat(vendorDues?.total_dues || 0).toFixed(2)}
                </Text>
                <Text style={styles.summarySubText}>{vendorDues?.count || 0} vendors</Text>
              </View>
            </View>

            <View style={styles.filterCard}>
              <Text style={styles.filterHeading}>Filters</Text>
              <View style={styles.searchRow}>
                <Ionicons name="search" size={18} color="#8A94A6" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search customer/vendor"
                  value={filters.searchTerm}
                  onChangeText={(value) =>
                    setFilters((prev) => ({ ...prev, searchTerm: value }))
                  }
                />
                {filters.searchTerm.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setFilters((prev) => ({ ...prev, searchTerm: '' }))}
                  >
                    <Ionicons name="close-circle" size={18} color="#8A94A6" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.searchRow}>
                <Ionicons name="search" size={18} color="#8A94A6" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search invoice/PO number"
                  value={filters.invoiceNumber}
                  onChangeText={(value) =>
                    setFilters((prev) => ({ ...prev, invoiceNumber: value }))
                  }
                />
                {filters.invoiceNumber.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setFilters((prev) => ({ ...prev, invoiceNumber: '' }))}
                  >
                    <Ionicons name="close-circle" size={18} color="#8A94A6" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.filterRow}>
                <View style={styles.filterItem}>
                  <Text style={styles.filterLabel}>Status</Text>
                  <PlatformPicker
                    selectedValue={filters.status}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, status: value }))
                    }
                    items={[
                      { label: 'All', value: '' },
                        { label: 'Completed', value: 'completed' },
                        { label: 'Pending', value: 'pending' },
                        { label: 'Failed', value: 'failed' },
                    ]}
                    placeholder={null}
                    wrapperStyle={styles.pickerWrapper}
                    pickerStyle={styles.picker}
                    modalTitle="Status"
                  />
                </View>
                <View style={styles.filterItem}>
                  <Text style={styles.filterLabel}>Payment Method</Text>
                  <PlatformPicker
                    selectedValue={filters.method}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, method: value }))
                    }
                    items={[
                      { label: 'All', value: '' },
                      { label: 'Cash', value: 'cash' },
                      { label: 'UPI', value: 'upi' },
                      { label: 'Card', value: 'card' },
                      { label: 'Bank', value: 'bank' },
                      { label: 'Cheque', value: 'cheque' },
                    ]}
                    placeholder={null}
                    wrapperStyle={styles.pickerWrapper}
                    pickerStyle={styles.picker}
                    modalTitle="Payment Method"
                  />
                </View>
              </View>
            </View>
          </>
        )}

        {activeTab === 'payments' && filteredPayments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cash-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {payments.length === 0 ? 'No payments found' : 'No matching payments'}
            </Text>
            <Text style={styles.emptySubText}>
              {payments.length === 0 ? 'Tap the + button to record a payment' : 'Try adjusting filters'}
            </Text>
          </View>
        ) : null}

        {activeTab === 'payments' && filteredPayments.length > 0 && (
          filteredPayments.map((payment) => {
            const derivedType = getPaymentType(payment);
            return (
              <TouchableOpacity
                key={payment.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate('PaymentDetails', { paymentId: payment.id })
                }
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Payment #{payment.id}</Text>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: getPaymentTypeColor(derivedType) },
                    ]}
                  >
                    <Text style={styles.typeText}>
                      {derivedType}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={16} color={theme.colors.textMuted} />
                  <Text style={styles.cardText}>
                    {derivedType === 'customer'
                      ? `Customer: ${payment.customer_name || 'N/A'}`
                      : derivedType === 'vendor'
                        ? `Vendor: ${payment.vendor_name || 'N/A'}`
                        : `Entity: ${payment.customer_name || payment.vendor_name || 'N/A'}`}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="card-outline" size={16} color={theme.colors.textMuted} />
                  <Text style={styles.cardText}>
                    Method: {payment.payment_method || 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
                  <Text style={styles.cardText}>
                    Date: {(payment.payment_date || payment.created_at)
                      ? new Date(payment.payment_date || payment.created_at).toLocaleDateString()
                      : 'N/A'}
                  </Text>
                </View>
                {payment.reference_number && (
                  <View style={styles.detailRow}>
                    <Ionicons name="barcode-outline" size={16} color={theme.colors.textMuted} />
                    <Text style={styles.cardText}>
                      Ref: {payment.reference_number}
                    </Text>
                  </View>
                )}
                <Text style={styles.cardAmount}>
                  Amount: ₹{parseFloat(payment.amount || 0).toFixed(2)}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        {activeTab === 'dues' && (
          <View style={styles.duesContainer}>
            <View style={[styles.summaryCard, styles.summaryWarning]}>
              <Text style={styles.summaryLabel}>Customer Dues</Text>
              <Text style={styles.summaryValue}>
                ₹{parseFloat(customerDues?.total_dues || 0).toFixed(2)}
              </Text>
              <Text style={styles.summarySubText}>{customerDues?.count || 0} customers</Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryDanger]}>
              <Text style={styles.summaryLabel}>Vendor Dues</Text>
              <Text style={styles.summaryValue}>
                ₹{parseFloat(vendorDues?.total_dues || 0).toFixed(2)}
              </Text>
              <Text style={styles.summarySubText}>{vendorDues?.count || 0} vendors</Text>
            </View>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('DuesReport')}
            >
              <Text style={styles.linkButtonText}>Open Dues Report</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'overdue' && (
          overdueDues.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="alert-circle-outline" size={64} color={theme.colors.textLight} />
              <Text style={styles.emptyText}>No overdue dues</Text>
              <Text style={styles.emptySubText}>All dues are up to date</Text>
            </View>
          ) : (
            overdueDues.map((item, index) => (
                <View key={item.id || index} style={styles.card}>
                  <Text style={styles.cardTitle}>
                    {item.customer_name || item.vendor_name || 'Overdue'}
                  </Text>
                  {item.type && (
                    <View style={styles.detailRow}>
                      <Ionicons name="pricetag-outline" size={16} color={theme.colors.textMuted} />
                      <Text style={styles.cardText}>Type: {item.type}</Text>
                    </View>
                  )}
                  {item.due_date && (
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
                      <Text style={styles.cardText}>
                        Due: {new Date(item.due_date).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                  {(item.amount || item.due_amount) && (
                    <Text style={styles.cardAmount}>
                      Amount: ₹{parseFloat(item.amount || item.due_amount || 0).toFixed(2)}
                    </Text>
                  )}
                </View>
              ))
          )
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 10,
    columnGap: 12,
  },
  heroText: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 200,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  list: {
    flex: 1,
    padding: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: '48%',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.light,
  },
  summaryPrimary: {
    borderLeftColor: theme.colors.secondary,
  },
  summaryWarning: {
    borderLeftColor: theme.colors.warning,
  },
  summaryDanger: {
    borderLeftColor: theme.colors.danger,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  summarySubText: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  filterCard: {
    backgroundColor: theme.colors.card,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.light,
    marginBottom: 16,
  },
  filterHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'visible',
    height: 50,
  },
  picker: {
    height: 50,
    width: '100%',
    color: theme.colors.text,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.light,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  cardText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  duesContainer: {
    gap: 12,
  },
  linkButton: {
    backgroundColor: theme.colors.card,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  linkButtonText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});

export default PaymentsScreen;
