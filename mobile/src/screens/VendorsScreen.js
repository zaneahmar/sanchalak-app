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
import { vendorAPI, api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToaster } from '../context/ToasterContext';
import theme from '../styles/theme';

const VendorsScreen = ({ navigation }) => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [gstVerification, setGstVerification] = useState({
    status: null,
    message: '',
  });
  const { showToast } = useToaster();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    tax_id: '',
    bank_account: '',
    gstin: '',
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const data = await vendorAPI.getAll();
      setVendors(data || []);
    } catch (error) {
      showToast('Error fetching vendors', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchVendors();
    setRefreshing(false);
  }, []);

  const verifyGST = async () => {
    if (!formData.gstin || formData.gstin.trim() === '') {
      setGstVerification({
        status: 'invalid',
        message: 'Please enter a GST number',
      });
      return;
    }

    setGstVerification({
      status: 'verifying',
      message: 'Verifying...',
    });

    try {
      const response = await api.post('/vendors/verify-gst', {
        gstin: formData.gstin.toUpperCase(),
      });

      if (response.valid) {
        setGstVerification({
          status: 'valid',
          message: response.message || 'GST number is valid',
        });
        setFormData((prev) => ({
          ...prev,
          gstin: formData.gstin.toUpperCase(),
        }));
      } else {
        setGstVerification({
          status: 'invalid',
          message: response.message || 'GST number is invalid',
        });
      }
    } catch (error) {
      setGstVerification({
        status: 'invalid',
        message: error.message || 'Error verifying GST number',
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      showToast('Name, email, and phone are required', 'error');
      return;
    }

    try {
      if (editingId) {
        await vendorAPI.update(editingId, formData);
        showToast('Vendor updated successfully', 'success');
      } else {
        await vendorAPI.create(formData);
        showToast('Vendor created successfully', 'success');
      }
      resetForm();
      fetchVendors();
    } catch (error) {
      showToast(error.message || 'Error saving vendor', 'error');
    }
  };

  const handleEdit = (vendor) => {
    setFormData({
      name: vendor.name || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      zip_code: vendor.zip_code || '',
      tax_id: vendor.tax_id || '',
      bank_account: vendor.bank_account || '',
      gstin: vendor.gstin || '',
    });
    setEditingId(vendor.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Vendor',
      'Are you sure you want to delete this vendor?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await vendorAPI.delete(id);
              showToast('Vendor deleted successfully', 'success');
              fetchVendors();
            } catch (error) {
              showToast(error.message || 'Error deleting vendor', 'error');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      tax_id: '',
      bank_account: '',
      gstin: '',
    });
    setEditingId(null);
    setShowForm(false);
    setGstVerification({ status: null, message: '' });
  };

  const filteredVendors = vendors.filter(
    (vendor) =>
      vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.phone?.includes(searchTerm)
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View>
          <Text style={styles.heroTitle}>Vendor Management</Text>
          <Text style={styles.heroSubtitle}>Manage your vendor list</Text>
        </View>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setShowForm(true)}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Add Vendor</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>Search Vendor</Text>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#8A94A6" />
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
        {filteredVendors.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={40} color="#B0B7C3" />
            <Text style={styles.emptyTitle}>No vendors yet</Text>
            <Text style={styles.emptySubtitle}>Tap “Add Vendor” to create your first vendor.</Text>
          </View>
        ) : (
          filteredVendors.map((vendor) => (
            <View key={vendor.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{vendor.name}</Text>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.detailRow}>
                  <Ionicons name="mail-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{vendor.email || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{vendor.phone || '-'}</Text>
                </View>
                {vendor.gstin && (
                  <View style={styles.detailRow}>
                    <Ionicons name="document-text-outline" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>GST: {vendor.gstin}</Text>
                  </View>
                )}
                {vendor.city && (
                  <View style={styles.detailRow}>
                    <Ionicons name="map-outline" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>{vendor.city}{vendor.state ? `, ${vendor.state}` : ''}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionPrimary]}
                  onPress={() => navigation.navigate('VendorDebitCredit', { vendorId: vendor.id })}
                >
                  <Ionicons name="document-text-outline" size={16} color="#fff" />
                  <Text style={styles.actionTextLight}>Debit/Credit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionOutline]}
                  onPress={() => handleEdit(vendor)}
                >
                  <Ionicons name="pencil-outline" size={16} color="#667eea" />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionDanger]}
                  onPress={() => handleDelete(vendor.id)}
                >
                  <Ionicons name="trash-outline" size={16} color="#fff" />
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
                {editingId ? 'Edit Vendor' : 'Add Vendor'}
              </Text>
              <TouchableOpacity onPress={resetForm}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.form}
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formCard}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Vendor Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Vendor Name"
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.half]}>
                    <Text style={styles.label}>Email *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      value={formData.email}
                      onChangeText={(text) => setFormData({ ...formData, email: text })}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.half]}>
                    <Text style={styles.label}>Phone *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Phone"
                      value={formData.phone}
                      onChangeText={(text) => setFormData({ ...formData, phone: text })}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Address</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Address"
                    value={formData.address}
                    onChangeText={(text) =>
                      setFormData({ ...formData, address: text })
                    }
                    multiline
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.third]}>
                    <Text style={styles.label}>City</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="City"
                      value={formData.city}
                      onChangeText={(text) => setFormData({ ...formData, city: text })}
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.third]}>
                    <Text style={styles.label}>State</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="State"
                      value={formData.state}
                      onChangeText={(text) => setFormData({ ...formData, state: text })}
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.third]}>
                    <Text style={styles.label}>ZIP Code</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="ZIP Code"
                      value={formData.zip_code}
                      onChangeText={(text) =>
                        setFormData({ ...formData, zip_code: text })
                      }
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.half]}>
                    <Text style={styles.label}>Tax ID</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Tax ID"
                      value={formData.tax_id}
                      onChangeText={(text) =>
                        setFormData({ ...formData, tax_id: text })
                      }
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.half]}>
                    <Text style={styles.label}>Bank Account</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Bank Account"
                      value={formData.bank_account}
                      onChangeText={(text) =>
                        setFormData({ ...formData, bank_account: text })
                      }
                    />
                  </View>
                </View>

                <View style={styles.gstSection}>
                  <Text style={styles.gstLabel}>GST Number (Optional)</Text>
                  <View style={styles.gstContainer}>
                    <TextInput
                      style={[styles.input, styles.gstInput]}
                      placeholder="GSTIN (e.g., 22AAAAA0000A1Z5)"
                      value={formData.gstin}
                      onChangeText={(text) => {
                        setFormData({ ...formData, gstin: text });
                        setGstVerification({ status: null, message: '' });
                      }}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity
                      style={styles.verifyButton}
                      onPress={verifyGST}
                    >
                      <Text style={styles.verifyButtonText}>Verify</Text>
                    </TouchableOpacity>
                  </View>
                  {gstVerification.message && (
                    <Text
                      style={[
                        styles.gstMessage,
                        gstVerification.status === 'valid' && styles.gstValid,
                        gstVerification.status === 'invalid' && styles.gstInvalid,
                      ]}
                    >
                      {gstVerification.message}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.submitButton, styles.actionButtonFull]}
                  onPress={handleSubmit}
                >
                  <Text style={styles.submitButtonText}>
                    {editingId ? 'Update Vendor' : 'Add Vendor'}
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
    gap: 12,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
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
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
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
  gstSection: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F0FDFA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  gstLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F766E',
    marginBottom: 8,
  },
  gstContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
  },
  gstInput: {
    flexGrow: 1,
    flexBasis: '68%',
    minWidth: 180,
    marginRight: 0,
    marginBottom: 0,
  },
  verifyButton: {
    backgroundColor: '#38b2ac',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    flexGrow: 1,
  },
  verifyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  gstMessage: {
    marginBottom: 16,
    fontSize: 14,
  },
  gstValid: {
    color: '#34C759',
  },
  gstInvalid: {
    color: '#FF3B30',
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

export default VendorsScreen;
