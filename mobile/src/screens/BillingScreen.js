import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Platform,
  Linking,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import PlatformPicker from '../components/PlatformPicker';
import { Ionicons } from '@expo/vector-icons';
import { billingAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToaster } from '../context/ToasterContext';

const BillingScreen = ({ navigation }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const { showToast } = useToaster();

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const data = await billingAPI.getAll();
      setBills(data || []);
    } catch (error) {
      showToast('Error fetching bills', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBills();
    setRefreshing(false);
  }, []);

  const handleDownloadPDF = async (bill) => {
    try {
      const result = await billingAPI.downloadPDF(bill.id, bill.invoice_number);
      if (!result?.localUri) {
        showToast('Unable to download invoice', 'error');
        return;
      }

      const fileInfo = await FileSystem.getInfoAsync(result.localUri);
      if (!fileInfo?.exists) {
        showToast('Downloaded file not found', 'error');
        return;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.localUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Invoice ${bill.invoice_number || bill.id}`,
          UTI: 'com.adobe.pdf',
        });
        showToast('Invoice downloaded', 'success');
      } else {
        await Linking.openURL(result.localUri);
        showToast('Invoice downloaded', 'success');
      }
    } catch (error) {
      showToast(error?.message || 'Error downloading invoice', 'error');
      console.error('Invoice download error:', error);
    }
  };

  const getStatusMeta = (bill) => {
    const statusValue = String(bill.payment_status || bill.status || 'unpaid').toLowerCase();
    if (statusValue === 'paid') {
      return { label: 'Paid', color: '#34C759' };
    }
    if (statusValue === 'partial') {
      return { label: 'Partial', color: '#FF9500' };
    }
    return { label: 'Unpaid', color: '#FF3B30' };
  };

  const getBillAmount = (bill) => {
    const rawAmount =
      bill.total_amount ?? bill.amount ?? bill.subtotal ?? bill.total ?? bill.grand_total;
    const parsed = parseFloat(rawAmount);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const filterBills = () => {
    return bills.filter((bill) => {
      // Date filter
      if (dateFilter !== 'all') {
        const billDateValue = bill.invoice_date || bill.created_at;
        if (!billDateValue) return false;
        const billDate = new Date(billDateValue);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === 'today') {
          const billDateOnly = new Date(billDate);
          billDateOnly.setHours(0, 0, 0, 0);
          if (billDateOnly.getTime() !== today.getTime()) return false;
        } else if (dateFilter === 'thisWeek') {
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          if (billDate < weekAgo) return false;
        } else if (dateFilter === 'thisMonth') {
          if (
            billDate.getMonth() !== today.getMonth() ||
            billDate.getFullYear() !== today.getFullYear()
          )
            return false;
        }
      }

      // Payment method filter
      if (paymentFilter !== 'all') {
        if (String(bill.payment_method || '').toLowerCase() !== paymentFilter.toLowerCase()) {
          return false;
        }
      }

      // Search filter
      if (searchText !== '') {
        const customerName = bill.customer_name || '';
        if (!customerName.toLowerCase().includes(searchText.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  };

  const filteredBills = filterBills();
  const totalRevenue = filteredBills.reduce((sum, bill) => sum + getBillAmount(bill), 0);
  const totalPaid = filteredBills.reduce((sum, bill) => {
    const statusValue = String(bill.payment_status || bill.status || 'unpaid').toLowerCase();
    return statusValue === 'paid' ? sum + getBillAmount(bill) : sum;
  }, 0);
  const totalUnpaid = filteredBills.reduce((sum, bill) => {
    const statusValue = String(bill.payment_status || bill.status || 'unpaid').toLowerCase();
    return statusValue !== 'paid' ? sum + getBillAmount(bill) : sum;
  }, 0);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Billing</Text>
          <Text style={styles.heroSubtitle}>Manage invoices and payments</Text>
        </View>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.filterHeading}>Filters</Text>
        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Date</Text>
            <PlatformPicker
              selectedValue={dateFilter}
              onValueChange={(value) => setDateFilter(value)}
              items={[
                { label: 'All', value: 'all' },
                { label: 'Today', value: 'today' },
                { label: 'This Week', value: 'thisWeek' },
                { label: 'This Month', value: 'thisMonth' },
              ]}
              placeholder={null}
              wrapperStyle={styles.pickerWrapper}
              pickerStyle={styles.picker}
              modalTitle="Date Filter"
            />
          </View>

          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Payment Method</Text>
            <PlatformPicker
              selectedValue={paymentFilter}
              onValueChange={(value) => setPaymentFilter(value)}
              items={[
                { label: 'All', value: 'all' },
                { label: 'Cash', value: 'cash' },
                { label: 'UPI', value: 'upi' },
                { label: 'Card', value: 'card' },
                { label: 'Bank Transfer', value: 'bank_transfer' },
                { label: 'Cheque', value: 'cheque' },
              ]}
              placeholder={null}
              wrapperStyle={styles.pickerWrapper}
              pickerStyle={styles.picker}
              modalTitle="Payment Filter"
            />
          </View>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#8A94A6" />
          <TextInput
            style={styles.searchInput}
            placeholder="Enter customer name"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color="#8A94A6" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, styles.summaryRevenue]}>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
          <Text style={styles.summaryValue}>₹{totalRevenue.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryPaid]}>
          <Text style={styles.summaryLabel}>Total Paid</Text>
          <Text style={styles.summaryValue}>₹{totalPaid.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryUnpaid]}>
          <Text style={styles.summaryLabel}>Total Unpaid</Text>
          <Text style={styles.summaryValue}>₹{totalUnpaid.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryCount]}>
          <Text style={styles.summaryLabel}>Total Invoices</Text>
          <Text style={styles.summaryValue}>{filteredBills.length}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>Invoices</Text>
        {filteredBills.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {bills.length === 0 ? 'No invoices found' : 'No matching invoices'}
            </Text>
          </View>
        ) : (
          filteredBills.map((bill) => {
            const statusMeta = getStatusMeta(bill);
            return (
              <View key={bill.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>
                    Invoice #{bill.invoice_number}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusMeta.color },
                    ]}
                  >
                    <Text style={styles.statusText}>{statusMeta.label}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={16} color="#6B7280" />
                  <Text style={styles.cardText}>
                    Customer: {bill.customer_name || 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                  <Text style={styles.cardText}>
                    Date: {(bill.invoice_date || bill.created_at)
                      ? new Date(bill.invoice_date || bill.created_at).toLocaleDateString()
                      : 'N/A'}
                  </Text>
                </View>
                {bill.due_date && (
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={16} color="#6B7280" />
                    <Text style={styles.cardText}>
                      Due: {new Date(bill.due_date).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Ionicons name="card-outline" size={16} color="#6B7280" />
                  <Text style={styles.cardText}>
                    Payment: {bill.payment_method || 'Cash'}
                  </Text>
                </View>
                <Text style={styles.cardAmount}>
                  Amount: ₹{getBillAmount(bill).toFixed(2)}
                </Text>
                {bill.paid_amount > 0 && (
                  <Text style={styles.cardPaid}>
                    Paid: ₹{parseFloat(bill.paid_amount || 0).toFixed(2)}
                  </Text>
                )}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionPrimary]}
                    onPress={() =>
                      navigation.navigate('BillingDetails', { billId: bill.id })
                    }
                  >
                    <Ionicons name="eye-outline" size={18} color="#fff" />
                    <Text style={styles.actionButtonTextLight}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionSecondary]}
                    onPress={() => handleDownloadPDF(bill)}
                  >
                    <Ionicons name="download-outline" size={18} color="#fff" />
                    <Text style={styles.actionButtonTextLight}>Download</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
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
    color: '#1F2937',
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  filterCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EAF2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  filterHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#667eea',
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
    backgroundColor: '#F6F8FC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E3E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryRevenue: {
    borderLeftColor: '#48BB78',
  },
  summaryPaid: {
    borderLeftColor: '#34C759',
  },
  summaryUnpaid: {
    borderLeftColor: '#F59E0B',
  },
  summaryCount: {
    borderLeftColor: '#8B5CF6',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6EAF2',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
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
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    color: '#4B5563',
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
    marginTop: 8,
  },
  cardPaid: {
    fontSize: 14,
    color: '#10B981',
    marginTop: 4,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionPrimary: {
    backgroundColor: '#667eea',
  },
  actionSecondary: {
    backgroundColor: '#48BB78',
  },
  actionButtonTextLight: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default BillingScreen;
