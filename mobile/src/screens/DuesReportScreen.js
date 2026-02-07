import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  TextInput,
} from 'react-native';
import PlatformPicker from '../components/PlatformPicker';
import { Ionicons } from '@expo/vector-icons';
import { billingAPI, purchaseOrderAPI, paymentAPI, customerAPI, vendorAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToaster } from '../context/ToasterContext';
import theme from '../styles/theme';

const DuesReportScreen = ({ navigation }) => {
  const [customerDues, setCustomerDues] = useState([]);
  const [vendorDues, setVendorDues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'customer', 'vendor'
  const [duesFilter, setDuesFilter] = useState(''); // '', 'pending', 'overdue'
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToaster();

  useEffect(() => {
    fetchDues();
  }, []);

  const getBillingAmount = (bill) => {
    const rawAmount = bill.total_amount ?? bill.amount ?? bill.subtotal ?? bill.total ?? bill.grand_total;
    const parsed = parseFloat(rawAmount);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getPoAmount = (po) => {
    const rawAmount = po.total_amount ?? po.amount ?? po.total ?? po.grand_total;
    const parsed = parseFloat(rawAmount);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const fetchDues = async () => {
    try {
      setLoading(true);

      const [bills, pos, payments, customers, vendors] = await Promise.all([
        billingAPI.getAll(),
        purchaseOrderAPI.getAll(),
        paymentAPI.getAll(),
        customerAPI.getAll(),
        vendorAPI.getAll(),
      ]);

      const customerMap = (customers || []).reduce((acc, customer) => {
        acc[Number(customer.id)] = customer;
        return acc;
      }, {});

      const vendorMap = (vendors || []).reduce((acc, vendor) => {
        acc[Number(vendor.id)] = vendor;
        return acc;
      }, {});

      const completedPayments = (payments || []).filter(
        (payment) => String(payment.status || '').toLowerCase() === 'completed'
      );

      // Customer dues from unpaid/partial bills
      const unpaidCustomerBills = (bills || [])
        .filter((bill) => {
          const statusValue = String(bill.status || bill.payment_status || 'unpaid').toLowerCase();
          return statusValue === 'unpaid' || statusValue === 'partial';
        })
        .map((bill) => {
          const total = getBillingAmount(bill);
          const paid = completedPayments
            .filter((payment) => Number(payment.billing_id) === Number(bill.id))
            .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
          const dueAmount = Math.max(0, total - paid);
          const customer = customerMap[Number(bill.customer_id)] || {};
          return {
            ...bill,
            customer_name: bill.customer_name || customer.name || 'N/A',
            due_amount: dueAmount,
          };
        })
        .filter((bill) => bill.due_amount > 0);
      setCustomerDues(unpaidCustomerBills);

      // Vendor dues from unpaid POs
      const unpaidVendorPOs = (pos || [])
        .map((po) => {
          const total = getPoAmount(po);
          const paid = completedPayments
            .filter((payment) => Number(payment.po_id) === Number(po.id))
            .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
          const dueAmount = Math.max(0, total - paid);
          const vendor = vendorMap[Number(po.vendor_id)] || {};
          return {
            ...po,
            vendor_name: po.vendor_name || vendor.name || 'N/A',
            due_amount: dueAmount,
          };
        })
        .filter((po) => po.due_amount > 0);
      setVendorDues(unpaidVendorPOs);
    } catch (error) {
      showToast('Error fetching dues', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDues();
    setRefreshing(false);
  }, []);

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + (parseFloat(item.due_amount) || 0), 0);
  };

  const getDueStatus = (amount) => {
    const value = parseFloat(amount || 0);
    if (value > 20000) return { label: 'Critical', color: theme.colors.danger };
    if (value > 10000) return { label: 'Warning', color: theme.colors.warning };
    return { label: 'Normal', color: theme.colors.success };
  };

  const filterDues = (items, type) => {
    let filtered = items;

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter((item) => {
        const name = String(item.customer_name || item.vendor_name || '').toLowerCase();
        return name.includes(query);
      });
    }

    if (duesFilter === 'overdue') {
      // Show high outstanding (>10,000)
      filtered = filtered.filter((item) => {
        const due = parseFloat(item.due_amount || 0);
        return due > 10000;
      });
    }

    return filtered;
  };

  const getFilteredCustomerDues = () => filterDues(customerDues, 'customer');
  const getFilteredVendorDues = () => filterDues(vendorDues, 'vendor');

  if (loading) {
    return <LoadingSpinner />;
  }

  const filteredCustomerDues = getFilteredCustomerDues();
  const filteredVendorDues = getFilteredVendorDues();
  const totalCustomerDues = calculateTotal(filteredCustomerDues);
  const totalVendorDues = calculateTotal(filteredVendorDues);
  const totalOutstanding = totalCustomerDues + totalVendorDues;
  const showCustomers = filterType === 'all' || filterType === 'customer';
  const showVendors = filterType === 'all' || filterType === 'vendor';

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Dues & Receivables Report</Text>
          <Text style={styles.heroSubtitle}>Track outstanding amounts</Text>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, styles.summaryPrimary]}>
          <Text style={styles.summaryLabel}>Total Outstanding Dues</Text>
          <Text style={styles.summaryValue}>₹{totalOutstanding.toFixed(2)}</Text>
          <Text style={styles.summaryMeta}>Across all entities</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryWarning]}>
          <Text style={styles.summaryLabel}>Customer Receivables</Text>
          <Text style={styles.summaryValue}>₹{totalCustomerDues.toFixed(2)}</Text>
          <Text style={styles.summaryMeta}>From {filteredCustomerDues.length} customers</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryDanger]}>
          <Text style={styles.summaryLabel}>Vendor Payables</Text>
          <Text style={styles.summaryValue}>₹{totalVendorDues.toFixed(2)}</Text>
          <Text style={styles.summaryMeta}>To {filteredVendorDues.length} vendors</Text>
        </View>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.filterHeading}>Filters</Text>
        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Type</Text>
            <PlatformPicker
              selectedValue={filterType}
              onValueChange={(value) => setFilterType(value)}
              items={[
                { label: 'All (Customers & Vendors)', value: 'all' },
                { label: 'Customers Only', value: 'customer' },
                { label: 'Vendors Only', value: 'vendor' },
              ]}
              placeholder={null}
              wrapperStyle={styles.pickerWrapper}
              pickerStyle={styles.picker}
              modalTitle="Type Filter"
            />
          </View>

          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Due Status</Text>
            <PlatformPicker
              selectedValue={duesFilter}
              onValueChange={(value) => setDuesFilter(value)}
              items={[
                { label: 'All Due Status', value: '' },
                { label: 'Pending (All)', value: 'pending' },
                { label: 'High Outstanding (>₹10,000)', value: 'overdue' },
              ]}
              placeholder={null}
              wrapperStyle={styles.pickerWrapper}
              pickerStyle={styles.picker}
              modalTitle="Status Filter"
            />
          </View>
        </View>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#8A94A6" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search entity name"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <Text style={styles.clearText} onPress={() => setSearchTerm('')}>
              Clear
            </Text>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {showCustomers && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Receivables</Text>
            {filteredCustomerDues.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No pending receivables</Text>
            </View>
          ) : (
            filteredCustomerDues.map((bill) => {
              const dueAmount = parseFloat(bill.due_amount || 0);
              const status = getDueStatus(dueAmount);
              return (
                <View key={bill.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>
                      Invoice #{bill.invoice_number}
                    </Text>
                    <Text style={styles.dueAmount}>
                      ₹{dueAmount.toFixed(2)}
                    </Text>
                  </View>
                  <Text style={styles.cardText}>
                    Customer: {bill.customer_name}
                  </Text>
                  <Text style={styles.cardText}>
                    Date: {(bill.invoice_date || bill.created_at)
                      ? new Date(bill.invoice_date || bill.created_at).toLocaleDateString()
                      : 'N/A'}
                  </Text>
                  {bill.due_date && (
                    <Text style={[
                      styles.cardText,
                      new Date(bill.due_date) < new Date() && styles.overdueText
                    ]}>
                      Due: {new Date(bill.due_date).toLocaleDateString()}
                    </Text>
                  )}
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                    <Text style={[styles.statusText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
        )}

        {showVendors && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vendor Payables</Text>
          {filteredVendorDues.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No pending payables</Text>
            </View>
          ) : (
            filteredVendorDues.map((po) => {
              const dueAmount = parseFloat(po.due_amount || 0);
              const status = getDueStatus(dueAmount);
              return (
                <View key={po.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>
                      PO #{po.po_number || po.id}
                    </Text>
                    <Text style={styles.dueAmount}>
                      ₹{dueAmount.toFixed(2)}
                    </Text>
                  </View>
                  <Text style={styles.cardText}>
                    Vendor: {po.vendor_name}
                  </Text>
                  <Text style={styles.cardText}>
                    Date: {(po.order_date || po.created_at)
                      ? new Date(po.order_date || po.created_at).toLocaleDateString()
                      : 'N/A'}
                  </Text>
                  {(po.expected_delivery_date || po.expected_delivery) && (
                    <Text style={styles.cardText}>
                      Expected: {new Date(po.expected_delivery_date || po.expected_delivery).toLocaleDateString()}
                    </Text>
                  )}
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                    <Text style={[styles.statusText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>
              );
            })
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
    backgroundColor: theme.colors.background,
  },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  heroText: {
    flexShrink: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: '48%',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 14,
    borderTopWidth: 4,
    borderTopColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.light,
  },
  summaryPrimary: {
    borderTopColor: theme.colors.primary,
  },
  summaryWarning: {
    borderTopColor: theme.colors.warning,
  },
  summaryDanger: {
    borderTopColor: theme.colors.danger,
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
  summaryMeta: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.textLight,
  },
  filterCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.light,
  },
  filterHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 8,
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
    backgroundColor: 'transparent',
    color: '#111',
    fontSize: 14,
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
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  clearText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: theme.colors.text,
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
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
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
  dueAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.danger,
  },
  cardText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  overdueText: {
    color: theme.colors.danger,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default DuesReportScreen;
