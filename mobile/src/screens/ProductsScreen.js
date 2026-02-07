import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { DataContext } from '../context/DataContext';
import { ToasterContext } from '../context/ToasterContext';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';
import PlatformPicker from '../components/PlatformPicker';
import theme from '../styles/theme';

const ProductsScreen = ({ navigation }) => {
  const { products, fetchProducts, deleteProduct, isLoading } = useContext(DataContext);
  const { showSuccess, showError } = useContext(ToasterContext);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockStatus, setStockStatus] = useState('all');
  const [category, setCategory] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const result = await fetchProducts();
    if (!result.success) {
      showError('Failed to load inventory');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const handleDelete = async (id) => {
    const result = await deleteProduct(id);
    if (result.success) {
      showSuccess('Inventory item deleted successfully');
    } else {
      showError('Failed to delete inventory item');
    }
  };

  const renderProduct = ({ item }) => (
    <Card style={styles.productCard}>
      <View style={styles.productHeader}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.productDescription}>{item.description}</Text>
          )}
          {item.category && (
            <Text style={styles.productCategory}>Category: {item.category}</Text>
          )}
        </View>
        <View style={styles.productActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditProduct', { product: item })}
            style={styles.actionButton}
          >
            <Ionicons name="create-outline" size={20} color="#007bff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            style={styles.actionButton}
          >
            <Ionicons name="trash-outline" size={20} color="#dc3545" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.productDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Price:</Text>
            <Text style={styles.detailValue}>₹{parseFloat(item.price || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Stock:</Text>
            <Text style={[styles.detailValue, (item.stock_quantity || 0) < 10 && styles.lowStock]}>
              {item.stock_quantity || 0}
            </Text>
          </View>
        </View>
        {(item.category || item.color) && (
          <View style={styles.detailRow}>
            {item.category && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Size:</Text>
                <Text style={styles.detailValue}>{item.category}</Text>
              </View>
            )}
            {item.color && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Color:</Text>
                <Text style={styles.detailValue}>{item.color}</Text>
              </View>
            )}
          </View>
        )}
        {item.hsn_code && (
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>HSN:</Text>
              <Text style={styles.detailValue}>{item.hsn_code}</Text>
            </View>
          </View>
        )}
        {item.cost && (
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Cost:</Text>
              <Text style={styles.detailValue}>₹{parseFloat(item.cost || 0).toFixed(2)}</Text>
            </View>
            {item.cost && item.price && parseFloat(item.cost) > 0 && parseFloat(item.price) > 0 && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Margin:</Text>
                <Text style={[styles.detailValue, styles.marginValue]}>
                  ₹{(parseFloat(item.price) - parseFloat(item.cost)).toFixed(2)} 
                  ({((parseFloat(item.price) - parseFloat(item.cost)) / parseFloat(item.cost) * 100).toFixed(1)}%)
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Card>
  );

  if (isLoading && products.length === 0) {
    return <LoadingSpinner />;
  }

  const categories = Array.from(
    new Set(
      products
        .map((product) => product.category || product.size || '')
        .filter(Boolean)
    )
  );

  const filteredProducts = products.filter((product) => {
    const name = product.name || '';
    const stock = parseInt(product.stock_quantity || product.stock || 0, 10);
    const productCategory = product.category || product.size || '';

    if (searchTerm && !name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    if (category && productCategory !== category) {
      return false;
    }

    if (stockStatus !== 'all') {
      if (stockStatus === 'low' && !(stock > 0 && stock <= 10)) return false;
      if (stockStatus === 'out' && stock > 0) return false;
      if (stockStatus === 'in-stock' && stock <= 0) return false;
    }

    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Inventory Management</Text>
          <Text style={styles.heroSubtitle}>Track stock levels and pricing</Text>
        </View>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('AddProduct')}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Add Inventory</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.filterTitle}>Filters</Text>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#8A94A6" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search inventory items..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={18} color="#8A94A6" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Stock Status</Text>
            <PlatformPicker
              selectedValue={stockStatus}
              onValueChange={(value) => setStockStatus(value)}
              items={[
                { label: 'All', value: 'all' },
                { label: 'In Stock', value: 'in-stock' },
                { label: 'Low Stock (≤10)', value: 'low' },
                { label: 'Out of Stock', value: 'out' },
              ]}
              placeholder={null}
              wrapperStyle={styles.pickerWrapper}
              pickerStyle={styles.picker}
              modalTitle="Stock Status"
            />
          </View>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Category</Text>
            <PlatformPicker
              selectedValue={category}
              onValueChange={(value) => setCategory(value)}
              items={[
                { label: 'All Categories', value: '' },
                ...categories.map((item) => ({ label: item, value: item })),
              ]}
              placeholder={null}
              wrapperStyle={styles.pickerWrapper}
              pickerStyle={styles.picker}
              modalTitle="Category"
            />
          </View>
        </View>
      </View>
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={56} color="#B0B7C3" />
            <Text style={styles.emptyText}>
              {products.length === 0 ? 'No inventory items yet' : 'No matching items'}
            </Text>
            <Text style={styles.emptySubText}>
              {products.length === 0
                ? 'Tap “Add Inventory” to create your first item'
                : 'Try adjusting your filters'}
            </Text>
          </View>
        }
      />
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  filterTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginBottom: 10,
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
  listContent: {
    padding: 16,
  },
  productCard: {
    marginBottom: 16,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  productCategory: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  productActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  productDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  lowStock: {
    color: theme.colors.danger,
  },
  marginValue: {
    color: theme.colors.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
});

export default ProductsScreen;
