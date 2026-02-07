import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { customerAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToaster } from '../context/ToasterContext';
import theme from '../styles/theme';

const CustomersScreen = ({ navigation }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToaster();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    businessName: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerAPI.getAll();
      setCustomers(data || []);
    } catch (error) {
      showToast('Error fetching customers', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  }, []);

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      showToast('Name, email, and phone are required', 'error');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zipCode,
        business_name: formData.businessName,
      };

      if (editingId) {
        await customerAPI.update(editingId, payload);
        showToast('Customer updated successfully', 'success');
      } else {
        await customerAPI.create(payload);
        showToast('Customer created successfully', 'success');
      }
      resetForm();
      fetchCustomers();
    } catch (error) {
      showToast(error.message || 'Error saving customer', 'error');
    }
  };

  const handleEdit = (customer) => {
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      zipCode: customer.zip_code || customer.zipCode || '',
      businessName: customer.business_name || customer.businessName || '',
    });
    setEditingId(customer.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Customer',
      'Are you sure you want to delete this customer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await customerAPI.delete(id);
              showToast('Customer deleted successfully', 'success');
              fetchCustomers();
            } catch (error) {
              showToast(error.message || 'Error deleting customer', 'error');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      businessName: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Customer Management</Text>
          <Text style={styles.heroSubtitle}>Manage your customer list</Text>
        </View>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setShowForm(true)}
        >
          <Ionicons name="add" size={18} color={theme.colors.white} />
          <Text style={styles.primaryButtonText}>Add Customer</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>Search Customer</Text>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={theme.colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, phone"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={40} color={theme.colors.textLight} />
            <Text style={styles.emptyTitle}>No customers yet</Text>
            <Text style={styles.emptySubtitle}>Tap “Add Customer” to create your first customer.</Text>
          </View>
        ) : (
          filteredCustomers.map((customer) => (
            <View key={customer.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>{customer.name}</Text>
                  {(customer.business_name || customer.businessName) && (
                    <Text style={styles.businessName}>
                      {customer.business_name || customer.businessName}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.detailRow}>
                  <Ionicons name="mail-outline" size={16} color={theme.colors.textMuted} />
                  <Text style={styles.detailText}>{customer.email || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={16} color={theme.colors.textMuted} />
                  <Text style={styles.detailText}>{customer.phone || '-'}</Text>
                </View>
                {customer.address && (
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color={theme.colors.textMuted} />
                    <Text style={styles.detailText}>{customer.address}</Text>
                  </View>
                )}
                {(customer.city || customer.state) && (
                  <View style={styles.detailRow}>
                    <Ionicons name="map-outline" size={16} color={theme.colors.textMuted} />
                    <Text style={styles.detailText}>
                      {customer.city}
                      {customer.city && customer.state && ', '}
                      {customer.state}
                    </Text>
                  </View>
                )}
                {customer.zip_code && (
                  <View style={styles.detailRow}>
                    <Ionicons name="barcode-outline" size={16} color={theme.colors.textMuted} />
                    <Text style={styles.detailText}>ZIP: {customer.zip_code}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionPrimary]}
                  onPress={() => navigation.navigate('CustomerDebitCredit', { customerId: customer.id })}
                >
                  <Ionicons name="document-text-outline" size={16} color={theme.colors.white} />
                  <Text style={styles.actionTextLight}>Debit/Credit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionOutline]}
                  onPress={() => handleEdit(customer)}
                >
                  <Ionicons name="pencil-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionDanger]}
                  onPress={() => handleDelete(customer.id)}
                >
                  <Ionicons name="trash-outline" size={16} color={theme.colors.white} />
                  <Text style={styles.actionTextLight}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showForm} animationType="slide" transparent={false}>
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit Customer' : 'Add Customer'}
              </Text>
              <TouchableOpacity onPress={resetForm}>
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.form}
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formCard}>
                <View style={styles.formRow}>
                  <View style={[styles.inputGroup, styles.half]}>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Full name"
                      value={formData.name}
                      onChangeText={(text) =>
                        setFormData({ ...formData, name: text })
                      }
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.half]}>
                    <Text style={styles.label}>Business Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Business name"
                      value={formData.businessName}
                      onChangeText={(text) =>
                        setFormData({ ...formData, businessName: text })
                      }
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.inputGroup, styles.half]}>
                    <Text style={styles.label}>Phone Number *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Phone number"
                      value={formData.phone}
                      onChangeText={(text) =>
                        setFormData({ ...formData, phone: text })
                      }
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.half]}>
                    <Text style={styles.label}>Email *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Email address"
                      value={formData.email}
                      onChangeText={(text) =>
                        setFormData({ ...formData, email: text })
                      }
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.addressGroup]}>
                  <Text style={styles.label}>Address</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Street address"
                    value={formData.address}
                    onChangeText={(text) =>
                      setFormData({ ...formData, address: text })
                    }
                    multiline
                  />
                </View>

                <View style={[styles.formRow, styles.addressRow]}>
                  <View style={[styles.inputGroup, styles.third]}>
                    <Text style={styles.label}>City</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="City"
                      value={formData.city}
                      onChangeText={(text) =>
                        setFormData({ ...formData, city: text })
                      }
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.third]}>
                    <Text style={styles.label}>State</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="State"
                      value={formData.state}
                      onChangeText={(text) =>
                        setFormData({ ...formData, state: text })
                      }
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.third]}>
                    <Text style={styles.label}>Zip Code</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Zip Code"
                      value={formData.zipCode}
                      onChangeText={(text) =>
                        setFormData({ ...formData, zipCode: text })
                      }
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.submitButton, styles.actionButtonFull]}
                  onPress={handleSubmit}
                >
                  <Text style={styles.submitButtonText}>
                    {editingId ? 'Update Customer' : 'Create Customer'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionSecondary, styles.actionButtonFull]}
                  onPress={resetForm}
                >
                  <Text style={styles.actionSecondaryText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
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
    flexShrink: 0,
    maxWidth: '100%',
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
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  list: {
    flex: 1,
    padding: 16,
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
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  businessName: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  cardBody: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexGrow: 1,
    minWidth: 110,
  },
  actionPrimary: {
    backgroundColor: theme.colors.warning,
  },
  actionOutline: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  actionDanger: {
    backgroundColor: theme.colors.danger,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  actionTextLight: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.white,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  form: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  formContent: {
    paddingBottom: 32,
    flexGrow: 1,
  },
  formCard: {
    padding: 16,
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
    columnGap: 12,
    marginBottom: 12,
  },
  addressRow: {
    marginTop: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 20,
  },
  addressGroup: {
    marginBottom: 32,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
    columnGap: 12,
  },
  half: {
    flexGrow: 1,
    flexBasis: '48%',
    minWidth: 160,
  },
  third: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 120,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  formActions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  actionButtonFull: {
    flex: 1,
  },
  actionSecondary: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  actionSecondaryText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CustomersScreen;
