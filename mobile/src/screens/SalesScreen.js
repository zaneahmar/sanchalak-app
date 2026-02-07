import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { salesAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToaster } from '../context/ToasterContext';
import PlatformPicker from '../components/PlatformPicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import theme from '../styles/theme';
import { useFocusEffect } from '@react-navigation/native';

const SalesScreen = ({ navigation }) => {
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const { showToast } = useToaster();

  const normalizeDate = (value, endOfDay = false) => {
    if (!value) return null;

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return endOfDay
        ? new Date(year, month - 1, day, 23, 59, 59, 999)
        : new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    if (endOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }

    return date;
  };

  useEffect(() => {
    fetchSales();
    fetchSummary();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSales();
      fetchSummary();
    }, [])
  );

  const fetchSales = async () => {
    try {
      setLoading(true);
      const data = await salesAPI.getAll();
      setSales(data || []);
    } catch (error) {
      showToast('Error fetching sales', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await salesAPI.getSummary();
      setSummary(data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSales(), fetchSummary()]);
    setRefreshing(false);
  }, []);

  const formatCurrency = useCallback((amount) => {
    const parsed = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (Number.isNaN(parsed)) {
      return '0.00';
    }
    return parsed.toFixed(2);
  }, []);

  const paymentBadgeColor = useCallback((method) => {
    switch (String(method || '').toLowerCase()) {
      case 'cash':
        return theme.colors.primary;
      case 'card':
        return theme.colors.secondary;
      case 'upi':
        return theme.colors.info;
      case 'bank_transfer':
        return theme.colors.warning;
      case 'cheque':
        return theme.colors.accent;
      default:
        return theme.colors.textMuted;
    }
  }, []);

  const summaryCards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: 'Total Sales', value: summary.total_sales ?? 0 },
      { label: 'Total Revenue', value: `₹${formatCurrency(summary.total_revenue || 0)}` },
      { label: 'Average Sale', value: `₹${formatCurrency(summary.average_sale || 0)}` },
      { label: 'Highest Sale', value: `₹${formatCurrency(summary.highest_sale || 0)}` },
    ];
  }, [summary, formatCurrency]);

  const handleDelete = (saleId) => {
    Alert.alert(
      'Delete Sale',
      'Are you sure you want to delete this sale?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await salesAPI.delete(saleId);
              showToast('Sale deleted', 'success');
              await fetchSales();
              await fetchSummary();
            } catch (error) {
              showToast('Failed to delete sale', 'error');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const filteredSales = sales.filter((sale) => {
    const customer = String(sale.customer_name || 'Walk-in').toLowerCase();
    const payment = String(sale.payment_method || '').toLowerCase();
    const saleDateValue = sale.sale_date || sale.created_at;
    const saleDate = normalizeDate(saleDateValue);
    const fromDate = normalizeDate(dateFrom);
    const toDate = normalizeDate(dateTo, true);

    if (searchCustomer && !customer.includes(searchCustomer.toLowerCase())) {
      return false;
    }

    if (paymentFilter !== 'all' && payment !== paymentFilter) {
      return false;
    }

    if (fromDate && saleDate && saleDate < fromDate) {
      return false;
    }

    if (toDate && saleDate && saleDate > toDate) {
      return false;
    }

    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Sales Management</Text>
          <Text style={styles.heroSubtitle}>Track and manage sales</Text>
        </View>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('AddSale')}
        >
            <Ionicons name="add" size={18} color={theme.colors.white} />
          <Text style={styles.primaryButtonText}>New Sale</Text>
        </TouchableOpacity>
      </View>

      {summaryCards.length > 0 && (
        <View style={styles.summaryGrid}>
          {summaryCards.map((card) => (
            <View key={card.label} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{card.label}</Text>
              <Text style={styles.summaryValue}>{card.value}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>Filters</Text>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#8A94A6" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer"
            value={searchCustomer}
            onChangeText={setSearchCustomer}
          />
        </View>
        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text style={styles.filterItemLabel}>Payment Method</Text>
            <PlatformPicker
              selectedValue={paymentFilter}
              onValueChange={(value) => setPaymentFilter(value)}
              items={[
                { label: 'All', value: 'all' },
                { label: 'Cash', value: 'cash' },
                { label: 'Card', value: 'card' },
                { label: 'UPI', value: 'upi' },
                { label: 'Bank Transfer', value: 'bank_transfer' },
                { label: 'Cheque', value: 'cheque' },
              ]}
              placeholder={null}
              wrapperStyle={styles.pickerWrapper}
              pickerStyle={styles.picker}
              modalTitle="Payment Method"
            />
          </View>
        </View>
        <View style={[styles.filterRow, styles.filterRowSpacing]}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowFromPicker(true)}
          >
            <Text style={styles.dateText}>
              {dateFrom ? dateFrom.toLocaleDateString() : 'From Date'}
            </Text>
            <Ionicons name="calendar-outline" size={18} color="#667eea" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowToPicker(true)}
          >
            <Text style={styles.dateText}>
              {dateTo ? dateTo.toLocaleDateString() : 'To Date'}
            </Text>
            <Ionicons name="calendar-outline" size={18} color="#667eea" />
          </TouchableOpacity>
        </View>
        {showFromPicker && (
          <DateTimePicker
            value={dateFrom || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowFromPicker(false);
              if (event?.type !== 'dismissed' && selectedDate) {
                setDateFrom(selectedDate);
              }
            }}
          />
        )}
        {showToPicker && (
          <DateTimePicker
            value={dateTo || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowToPicker(false);
              if (event?.type !== 'dismissed' && selectedDate) {
                setDateTo(selectedDate);
              }
            }}
          />
        )}
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredSales.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={56} color={theme.colors.textLight} />
            <Text style={styles.emptyText}>No sales found</Text>
            <Text style={styles.emptySubText}>Tap “New Sale” to create one</Text>
          </View>
        ) : (
          filteredSales.map((sale) => {
            const firstItem = Array.isArray(sale.items) ? sale.items[0] : null;
            const productName = sale.product_name || firstItem?.product_name || 'N/A';
            const quantity = sale.quantity || firstItem?.quantity || 0;
            const saleDate = sale.sale_date || sale.created_at;
            return (
              <TouchableOpacity
                key={sale.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate('SaleDetails', { saleId: sale.id })
                }
              >
                <View style={styles.cardHeader}>
                  <Text
                    style={styles.cardTitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Sale #{sale.sale_number || sale.id}
                  </Text>
                  <View
                    style={[
                      styles.paymentBadge,
                      { backgroundColor: paymentBadgeColor(sale.payment_method) },
                    ]}
                  >
                    <Text style={styles.paymentBadgeText}>
                      {(sale.payment_method || 'N/A').replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={16} color={theme.colors.textMuted} />
                  <Text style={styles.cardText}>Customer: {sale.customer_name || 'Walk-in'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="cube-outline" size={16} color={theme.colors.textMuted} />
                  <Text style={styles.cardText}>Product: {productName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="pricetags-outline" size={16} color={theme.colors.textMuted} />
                  <Text style={styles.cardText}>Qty: {quantity}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
                  <Text style={styles.cardText}>
                    Date: {saleDate ? new Date(saleDate).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
                <Text style={styles.cardAmount}>
                  Amount: ₹{parseFloat(sale.total_amount || 0).toFixed(2)}
                </Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('AddSale', { saleId: sale.id })}
                  >
                    <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionDelete]}
                    onPress={() => handleDelete(sale.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                    <Text style={[styles.actionText, styles.actionDeleteText]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
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
    minWidth: 180,
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
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.light,
    minWidth: 150,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  filterCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.light,
  },
  filterLabel: {
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
  filterRowSpacing: {
    marginTop: 10,
  },
  filterItem: {
    flex: 1,
  },
  filterItemLabel: {
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
  dateButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  list: {
    flex: 1,
    padding: 16,
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
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
    marginRight: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
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
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: 110,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.white,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexGrow: 1,
    justifyContent: 'center',
    minWidth: 120,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  actionDelete: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.card,
  },
  actionDeleteText: {
    color: theme.colors.danger,
  },
});

export default SalesScreen;
