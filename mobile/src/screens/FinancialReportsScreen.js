import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reportAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToaster } from '../context/ToasterContext';
import theme from '../styles/theme';

const FinancialReportsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToaster();

  const reportTypes = [
    {
      id: 'profit-loss',
      title: 'Profit & Loss',
      description: 'View profit and loss statement',
      icon: 'trending-up-outline',
      color: theme.colors.secondary,
      screen: 'ProfitLossReport',
    },
    {
      id: 'balance-sheet',
      title: 'Balance Sheet',
      description: 'View balance sheet report',
      icon: 'stats-chart-outline',
      color: theme.colors.primary,
      screen: 'BalanceSheetReport',
    },
    {
      id: 'sales',
      title: 'Sales Report',
      description: 'View detailed sales analytics',
      icon: 'cart-outline',
      color: theme.colors.warning,
      screen: 'SalesReport',
    },
    {
      id: 'gst',
      title: 'GST Report',
      description: 'View GST filing information',
      icon: 'document-text-outline',
      color: theme.colors.accent,
      screen: 'GSTReport',
    },
    {
      id: 'customers',
      title: 'Customer Report',
      description: 'View customer analytics',
      icon: 'people-outline',
      color: theme.colors.danger,
      screen: 'CustomerReport',
    },
    {
      id: 'vendors',
      title: 'Vendor Report',
      description: 'View vendor analytics',
      icon: 'briefcase-outline',
      color: theme.colors.info,
      screen: 'VendorReport',
    },
    {
      id: 'inventory',
      title: 'Inventory Report',
      description: 'View stock levels and inventory',
      icon: 'cube-outline',
      color: theme.colors.info,
      screen: 'InventoryReport',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.list}>
        <Text style={styles.sectionTitle}>Financial Reports</Text>
        {reportTypes.map((report) => (
          <TouchableOpacity
            key={report.id}
            style={styles.card}
            onPress={() => navigation.navigate(report.screen)}
          >
            <View
              style={[styles.iconContainer, { backgroundColor: report.color }]}
            >
              <Ionicons name={report.icon} size={28} color="#fff" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{report.title}</Text>
              <Text style={styles.cardDescription}>{report.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textLight} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: theme.colors.text,
    letterSpacing: 0.4,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.light,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    color: theme.colors.text,
  },
  cardDescription: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});

export default FinancialReportsScreen;
