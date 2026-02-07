import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { purchaseOrderAPI, vendorAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToaster } from '../context/ToasterContext';
import PlatformPicker from '../components/PlatformPicker';
import theme from '../styles/theme';
import { useFocusEffect } from '@react-navigation/native';

const PurchaseOrdersScreen = ({ navigation }) => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const { showToast } = useToaster();

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPurchaseOrders();
    }, [])
  );

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const [data, vendorData] = await Promise.all([
        purchaseOrderAPI.getAll(),
        vendorAPI.getAll(),
      ]);
      setPurchaseOrders(data || []);
      setVendors(vendorData || []);
    } catch (error) {
      showToast('Error fetching purchase orders', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPurchaseOrders();
    setRefreshing(false);
  }, []);

  const vendorLookup = useMemo(() => {
    const lookup = new Map();
    (vendors || []).forEach((vendor) => {
      lookup.set(String(vendor.id), vendor.name);
    });
    return lookup;
  }, [vendors]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return theme.colors.warning;
      case 'approved':
      case 'confirmed':
        return theme.colors.primary;
      case 'received':
      case 'delivered':
        return theme.colors.secondary;
      case 'cancelled':
        return theme.colors.danger;
      case 'partial':
        return theme.colors.warning;
      case 'paid':
        return theme.colors.secondary;
      case 'unpaid':
        return theme.colors.danger;
      default:
        return theme.colors.textMuted;
    }
  };

  const handleDelete = (poId) => {
    Alert.alert(
      'Delete Purchase Order',
      'Are you sure you want to delete this purchase order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await purchaseOrderAPI.delete(poId);
              showToast('Purchase order deleted', 'success');
              fetchPurchaseOrders();
            } catch (error) {
              showToast('Failed to delete purchase order', 'error');
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

  const filteredOrders = purchaseOrders.filter((po) => {
    const poNumber = String(po.po_number || po.id || '').toLowerCase();
    const vendorName = String(
      po.vendor_name || vendorLookup.get(String(po.vendor_id)) || ''
    ).toLowerCase();
    const status = String(po.status || '').toLowerCase();

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      if (!poNumber.includes(query) && !vendorName.includes(query)) {
        return false;
      }
    }

    if (statusFilter !== 'all' && status !== statusFilter) {
      return false;
    }

    if (vendorFilter !== 'all' && String(po.vendor_id || '') !== String(vendorFilter)) {
      return false;
    }

    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Purchase Orders</Text>
          <Text style={styles.heroSubtitle}>Create and track vendor orders</Text>
        </View>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('AddPurchaseOrder')}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Create PO</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>Filters</Text>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#8A94A6" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search PO number or vendor"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text style={styles.filterItemLabel}>Status</Text>
            <PlatformPicker
              selectedValue={statusFilter}
              onValueChange={(value) => setStatusFilter(value)}
              items={[
                { label: 'All Status', value: 'all' },
                { label: 'Pending', value: 'pending' },
                { label: 'Approved', value: 'approved' },
                { label: 'Received', value: 'received' },
                { label: 'Cancelled', value: 'cancelled' },
                { label: 'Partial', value: 'partial' },
                { label: 'Paid', value: 'paid' },
                { label: 'Unpaid', value: 'unpaid' },
              ]}
              placeholder={null}
              wrapperStyle={styles.pickerWrapper}
              pickerStyle={styles.picker}
              modalTitle="Status"
            />
          </View>
          <View style={styles.filterItem}>
            <Text style={styles.filterItemLabel}>Vendor</Text>
            <PlatformPicker
              selectedValue={vendorFilter}
              onValueChange={(value) => setVendorFilter(value)}
              items={[
                { label: 'All Vendors', value: 'all' },
                ...(vendors || []).map((vendor) => ({
                  label: vendor.name,
                  value: vendor.id,
                })),
              ]}
              placeholder={null}
              wrapperStyle={styles.pickerWrapper}
              pickerStyle={styles.picker}
              modalTitle="Vendor"
            />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={56} color={theme.colors.textLight} />
            <Text style={styles.emptyText}>No purchase orders found</Text>
            <Text style={styles.emptySubText}>Tap “Create PO” to add one</Text>
          </View>
        ) : (
          filteredOrders.map((po) => (
            <TouchableOpacity
              key={po.id}
              style={styles.card}
              onPress={() =>
                navigation.navigate('PurchaseOrderDetails', { poId: po.id })
              }
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>PO #{po.po_number || po.id}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(po.status) },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {po.status || 'Pending'}
                  </Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="business-outline" size={16} color="#6B7280" />
                <Text style={styles.cardText}>
                  Vendor: {po.vendor_name || vendorLookup.get(String(po.vendor_id)) || 'N/A'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
                <Text style={styles.cardText}>
                  Date: {new Date(po.po_date).toLocaleDateString()}
                </Text>
              </View>
              {po.expected_delivery_date && (
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={16} color={theme.colors.textMuted} />
                  <Text style={styles.cardText}>
                    Expected: {new Date(po.expected_delivery).toLocaleDateString()}
                  </Text>
                </View>
              )}
              <Text style={styles.cardAmount}>
                Amount: ₹{parseFloat(po.total_amount || 0).toFixed(2)}
              </Text>
              {po.paid_amount > 0 && (
                <Text style={styles.cardPaid}>
                  Paid: ₹{parseFloat(po.paid_amount || 0).toFixed(2)}
                </Text>
              )}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('AddPurchaseOrder', { poId: po.id })}
                >
                  <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionDelete]}
                  onPress={() => handleDelete(po.id)}
                >
                  <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                  <Text style={[styles.actionText, styles.actionDeleteText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: theme.colors.white,
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
    color: theme.colors.textMuted,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 8,
  },
  cardPaid: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginTop: 4,
    fontWeight: '600',
  },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
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

export default PurchaseOrdersScreen;
