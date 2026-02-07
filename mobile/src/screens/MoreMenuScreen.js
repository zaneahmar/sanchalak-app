import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const MoreMenuScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const { isBlurred, toggleBlur } = useData();
  const userInitial = user?.name?.[0]?.toUpperCase() || 'U';

  const menuItems = [
    {
      id: 'profile',
      title: 'Profile',
      description: 'View and update your profile',
      icon: 'person-circle-outline',
      color: '#667eea',
      screen: 'UserProfile',
    },
    {
      id: 'purchase-orders',
      title: 'Purchase Orders',
      description: 'Manage vendor purchase orders',
      icon: 'cart-outline',
      color: '#ed8936',
      screen: 'PurchaseOrders',
    },
    {
      id: 'sales',
      title: 'Sales',
      description: 'View and manage sales',
      icon: 'trending-up-outline',
      color: '#48bb78',
      screen: 'Sales',
    },
    {
      id: 'billing',
      title: 'Billing',
      description: 'Create and manage invoices',
      icon: 'document-text-outline',
      color: '#764ba2',
      screen: 'Billing',
    },
    {
      id: 'payments',
      title: 'Payments',
      description: 'Track payments and transactions',
      icon: 'cash-outline',
      color: '#4299e1',
      screen: 'Payments',
    },
    {
      id: 'dues-report',
      title: 'Dues Report',
      description: 'View outstanding dues',
      icon: 'clipboard-outline',
      color: '#f56565',
      screen: 'DuesReport',
    },
    {
      id: 'financial-reports',
      title: 'Financial Reports',
      description: 'View financial statements and reports',
      icon: 'stats-chart-outline',
      color: '#1e3c72',
      screen: 'FinancialReports',
    },
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.list}>
        {/* User Profile Section */}
        <View style={styles.userSection}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{userInitial}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userRole}>
              {user?.business_name || 'Business Account'}
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        <Text style={styles.sectionTitle}>Menu</Text>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, { borderLeftColor: item.color }]}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View
              style={[styles.iconContainer, { backgroundColor: item.color }]}
            >
              <Ionicons name={item.icon} size={28} color="#fff" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#a0aec0" />
          </TouchableOpacity>
        ))}

        {/* Privacy / Blur */}
        <Text style={styles.sectionTitle}>Privacy</Text>
        <TouchableOpacity
          style={[
            styles.card,
            { borderLeftColor: isBlurred ? '#f56565' : '#48bb78' },
            isBlurred && styles.cardActive,
          ]}
          onPress={toggleBlur}
        >
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: isBlurred ? '#f56565' : '#48bb78' },
            ]}
          >
            <Ionicons
              name={isBlurred ? 'lock-closed-outline' : 'lock-open-outline'}
              size={28}
              color="#fff"
            />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>
              {isBlurred ? 'Unlock Screen' : 'Lock Screen'}
            </Text>
            <Text style={styles.cardDescription}>
              {isBlurred
                ? 'Tap to remove blur overlay'
                : 'Blur and lock the app view'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#f56565" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>© 2026 Sanchalak Store</Text>
        <Text style={styles.footerSubtext}>Wholesale Management System</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  userSection: {
    flexDirection: 'row',
    backgroundColor: '#1e3c72',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#1a202c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  userAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1a202c',
    letterSpacing: 0.4,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
    elevation: 3,
    shadowColor: '#1a202c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardActive: {
    borderWidth: 1,
    borderColor: '#f56565',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    color: '#1a202c',
  },
  cardDescription: {
    fontSize: 13,
    color: '#718096',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#1a202c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f56565',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f56565',
    marginLeft: 8,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#a0aec0',
    marginTop: 24,
    marginBottom: 4,
  },
  footerSubtext: {
    textAlign: 'center',
    fontSize: 11,
    color: '#cbd5e0',
    marginBottom: 32,
  },
});

export default MoreMenuScreen;
