import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { DataContext } from '../context/DataContext';
import { AuthContext } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';

const DashboardScreen = ({ navigation }) => {
  const { products, orders, sales, loadAllData, isLoading } = useContext(DataContext);
  const { user } = useContext(AuthContext);
  const [chartType, setChartType] = useState('line');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await loadAllData();
  };

  const totalSales = sales.reduce(
    (sum, sale) => sum + (parseFloat(sale.total_amount) || 0),
    0
  );
  const totalOrders = sales.length;
  const totalProducts = products.length;
  const inventoryValue = products.reduce(
    (sum, product) =>
      sum + (parseFloat(product.price || 0) * parseInt(product.stock_quantity || 0, 10)),
    0
  );

  const lowStockProducts = products.filter(
    (product) => (product.stock_quantity || 0) <= 10
  );

  const salesChartData = useMemo(() => {
    if (!sales || sales.length === 0) return null;
    const salesByDate = {};
    sales.forEach((sale) => {
      const date = new Date(sale.sale_date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      });
      salesByDate[date] = (salesByDate[date] || 0) + parseFloat(sale.total_amount || 0);
    });
    const sorted = Object.entries(salesByDate)
      .map(([date, amount]) => ({ date, amount: parseFloat(amount.toFixed(2)) }))
      .slice(-30);
    return {
      labels: sorted.map((item) => item.date),
      datasets: [{ data: sorted.map((item) => item.amount) }],
    };
  }, [sales]);

  const stats = [
    {
      title: 'Total Sales',
      value: `₹${totalSales.toFixed(2)}`,
      icon: 'trending-up-outline',
      color: '#667eea',
      bgColor: 'rgba(102, 126, 234, 0.12)',
    },
    {
      title: 'Total Orders',
      value: totalOrders,
      icon: 'cart-outline',
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.15)',
      screen: 'Orders',
    },
    {
      title: 'Total Products',
      value: totalProducts,
      icon: 'cube-outline',
      color: '#3B82F6',
      bgColor: 'rgba(59, 130, 246, 0.15)',
      screen: 'Products',
    },
    {
      title: 'Inventory Value',
      value: `₹${inventoryValue.toFixed(2)}`,
      icon: 'wallet-outline',
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.15)',
    },
  ];

  if (isLoading && products.length === 0) {
    return <LoadingSpinner />;
  }

  const chartWidth = Dimensions.get('window').width - 32;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Dashboard</Text>
        <Text style={styles.pageSubtitle}>
          Welcome back, {user?.business_name || 'User'}
        </Text>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.statCard, { borderLeftColor: stat.color }]}
            onPress={() => stat.screen && navigation.navigate(stat.screen)}
          >
            <View style={[styles.statAccent, { backgroundColor: stat.bgColor }]} />
            <View style={[styles.statIconBubble, { backgroundColor: stat.bgColor }]}
            >
              <Ionicons name={stat.icon} size={20} color={stat.color} />
            </View>
            <Text style={styles.statLabel}>{stat.title}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
          </TouchableOpacity>
        ))}
      </View>


      {orders.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          {orders.slice(0, 5).map((order) => (
            <View key={order.id} style={styles.orderItem}>
              <View>
                <Text style={styles.orderText}>Order #{order.id}</Text>
                <Text style={styles.orderSubText}>{order.customer_name}</Text>
              </View>
              <Text style={[styles.orderStatus, getStatusStyle(order.status)]}>
                {order.status}
              </Text>
            </View>
          ))}
        </View>
      )}
      {salesChartData && salesChartData.labels.length > 0 && (
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>Daily Sales Overview</Text>
            <View style={styles.chartControls}>
              <TouchableOpacity
                style={[styles.chartButton, chartType === 'line' && styles.chartButtonActive]}
                onPress={() => setChartType('line')}
              >
                <Text style={[styles.chartButtonText, chartType === 'line' && styles.chartButtonTextActive]}>Line</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chartButton, chartType === 'bar' && styles.chartButtonActive]}
                onPress={() => setChartType('bar')}
              >
                <Text style={[styles.chartButtonText, chartType === 'bar' && styles.chartButtonTextActive]}>Bar</Text>
              </TouchableOpacity>
            </View>
          </View>
          {chartType === 'line' ? (
            <LineChart
              data={salesChartData}
              width={chartWidth}
              height={260}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          ) : (
            <BarChart
              data={salesChartData}
              width={chartWidth}
              height={260}
              chartConfig={chartConfig}
              style={styles.chart}
            />
          )}
        </View>
      )}

      {lowStockProducts.length > 0 && (
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>⚠️ Low Stock Alert</Text>
          {lowStockProducts.map((product) => (
            <View key={product.id} style={styles.alertRow}>
              <Text style={styles.alertText}>{product.name}</Text>
              <Text style={styles.alertQty}>Only {product.stock_quantity || 0} left</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const getStatusStyle = (status) => {
  switch (status) {
    case 'completed':
      return { color: '#28a745' };
    case 'pending':
      return { color: '#ffc107' };
    case 'cancelled':
      return { color: '#dc3545' };
    default:
      return { color: '#666' };
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F2937',
  },
  pageSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#6B7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  statAccent: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 70,
    height: 70,
    borderRadius: 40,
  },
  statIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#6B7280',
    fontWeight: '700',
  },
  statValue: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  orderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  orderSubText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  chartCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  chartControls: {
    flexDirection: 'row',
    gap: 8,
  },
  chartButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#667eea',
    backgroundColor: 'transparent',
  },
  chartButtonActive: {
    backgroundColor: '#667eea',
  },
  chartButtonText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
  },
  chartButtonTextActive: {
    color: '#fff',
  },
  chart: {
    marginTop: 12,
    borderRadius: 12,
  },
  alertCard: {
    marginBottom: 16,
    backgroundColor: '#FFF5F5',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F56565',
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#742A2A',
    marginBottom: 10,
  },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FED7D7',
  },
  alertText: {
    fontSize: 14,
    color: '#742A2A',
    fontWeight: '600',
  },
  alertQty: {
    fontSize: 12,
    color: '#C53030',
    fontWeight: '600',
  },
});

const chartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
  style: {
    borderRadius: 12,
  },
  propsForDots: {
    r: '3',
    strokeWidth: '2',
    stroke: '#667eea',
  },
};

export default DashboardScreen;
