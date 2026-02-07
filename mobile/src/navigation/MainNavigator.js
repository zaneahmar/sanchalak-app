import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/DashboardScreen';
import ProductsScreen from '../screens/ProductsScreen';
import AddProductScreen from '../screens/AddProductScreen';
import EditProductScreen from '../screens/EditProductScreen';
import CustomersScreen from '../screens/CustomersScreen';
import CustomerDebitCreditScreen from '../screens/CustomerDebitCreditScreen';
import VendorsScreen from '../screens/VendorsScreen';
import VendorDebitCreditScreen from '../screens/VendorDebitCreditScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import AddOrderScreen from '../screens/AddOrderScreen';
import PurchaseOrdersScreen from '../screens/PurchaseOrdersScreen';
import PurchaseOrderDetailsScreen from '../screens/PurchaseOrderDetailsScreen';
import BillingScreen from '../screens/BillingScreen';
import BillingDetailsScreen from '../screens/BillingDetailsScreen';
import SalesScreen from '../screens/SalesScreen';
import SaleDetailsScreen from '../screens/SaleDetailsScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import PaymentDetailsScreen from '../screens/PaymentDetailsScreen';
import MoreMenuScreen from '../screens/MoreMenuScreen';
import FinancialReportsScreen from '../screens/FinancialReportsScreen';
import DuesReportScreen from '../screens/DuesReportScreen';
import AddPurchaseOrderScreen from '../screens/AddPurchaseOrderScreen';
import AddSaleScreen from '../screens/AddSaleScreen';
import AddPaymentScreen from '../screens/AddPaymentScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import AnimatedScreen from '../components/AnimatedScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const withScreenAnimation = (ScreenComponent, options = {}) => {
  const { animateOnFocus = true } = options;
  const Wrapped = (props) => (
    <AnimatedScreen animateOnFocus={animateOnFocus}>
      <ScreenComponent {...props} />
    </AnimatedScreen>
  );
  return Wrapped;
};

const AnimatedDashboardScreen = withScreenAnimation(DashboardScreen);
const AnimatedProductsScreen = withScreenAnimation(ProductsScreen);
const AnimatedAddProductScreen = withScreenAnimation(AddProductScreen);
const AnimatedEditProductScreen = withScreenAnimation(EditProductScreen);
const AnimatedCustomersScreen = withScreenAnimation(CustomersScreen);
const AnimatedCustomerDebitCreditScreen = withScreenAnimation(CustomerDebitCreditScreen);
const AnimatedVendorsScreen = withScreenAnimation(VendorsScreen);
const AnimatedVendorDebitCreditScreen = withScreenAnimation(VendorDebitCreditScreen);
const AnimatedOrdersScreen = withScreenAnimation(OrdersScreen);
const AnimatedOrderDetailsScreen = withScreenAnimation(OrderDetailsScreen);
const AnimatedAddOrderScreen = withScreenAnimation(AddOrderScreen);
const AnimatedPurchaseOrdersScreen = withScreenAnimation(PurchaseOrdersScreen);
const AnimatedPurchaseOrderDetailsScreen = withScreenAnimation(PurchaseOrderDetailsScreen);
const AnimatedBillingScreen = withScreenAnimation(BillingScreen);
const AnimatedBillingDetailsScreen = withScreenAnimation(BillingDetailsScreen);
const AnimatedSalesScreen = withScreenAnimation(SalesScreen);
const AnimatedSaleDetailsScreen = withScreenAnimation(SaleDetailsScreen);
const AnimatedPaymentsScreen = withScreenAnimation(PaymentsScreen);
const AnimatedPaymentDetailsScreen = withScreenAnimation(PaymentDetailsScreen);
const AnimatedMoreMenuScreen = withScreenAnimation(MoreMenuScreen, { animateOnFocus: false });
const AnimatedFinancialReportsScreen = withScreenAnimation(FinancialReportsScreen);
const AnimatedDuesReportScreen = withScreenAnimation(DuesReportScreen);
const AnimatedAddPurchaseOrderScreen = withScreenAnimation(AddPurchaseOrderScreen);
const AnimatedAddSaleScreen = withScreenAnimation(AddSaleScreen);
const AnimatedAddPaymentScreen = withScreenAnimation(AddPaymentScreen);
const AnimatedUserProfileScreen = withScreenAnimation(UserProfileScreen);
const AnimatedReportDetailScreen = withScreenAnimation(ReportDetailScreen);

// Root Stack Navigator that contains the Tab Navigator and all shared screens
const RootStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '700',
        },
        animation: 'none',
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={TabNavigator} 
        options={{ headerShown: false }}
      />
      {/* Shared screens accessible from any tab */}
      <Stack.Screen name="AddProduct" component={AnimatedAddProductScreen} options={{ title: 'Add Inventory' }} />
      <Stack.Screen name="EditProduct" component={AnimatedEditProductScreen} options={{ title: 'Edit Inventory' }} />
      <Stack.Screen name="Orders" component={AnimatedOrdersScreen} options={{ title: 'Orders' }} />
      <Stack.Screen name="OrderDetails" component={AnimatedOrderDetailsScreen} options={{ title: 'Order Details' }} />
      <Stack.Screen name="AddOrder" component={AnimatedAddOrderScreen} options={{ title: 'Add Order' }} />
      <Stack.Screen name="PurchaseOrders" component={AnimatedPurchaseOrdersScreen} options={{ title: 'Purchase Orders' }} />
      <Stack.Screen name="PurchaseOrderDetails" component={AnimatedPurchaseOrderDetailsScreen} options={{ title: 'Purchase Order' }} />
      <Stack.Screen name="AddPurchaseOrder" component={AnimatedAddPurchaseOrderScreen} options={{ title: 'Add Purchase Order' }} />
      <Stack.Screen name="Sales" component={AnimatedSalesScreen} options={{ title: 'Sales' }} />
      <Stack.Screen name="SaleDetails" component={AnimatedSaleDetailsScreen} options={{ title: 'Sale Details' }} />
      <Stack.Screen name="AddSale" component={AnimatedAddSaleScreen} options={{ title: 'Add Sale' }} />
      <Stack.Screen name="Billing" component={AnimatedBillingScreen} options={{ title: 'Billing' }} />
      <Stack.Screen name="BillingDetails" component={AnimatedBillingDetailsScreen} options={{ title: 'Invoice Details' }} />
      <Stack.Screen name="Payments" component={AnimatedPaymentsScreen} options={{ title: 'Payments' }} />
      <Stack.Screen name="PaymentDetails" component={AnimatedPaymentDetailsScreen} options={{ title: 'Payment Details' }} />
      <Stack.Screen name="AddPayment" component={AnimatedAddPaymentScreen} options={{ title: 'Add Payment' }} />
      <Stack.Screen name="DuesReport" component={AnimatedDuesReportScreen} options={{ title: 'Dues Report' }} />
      <Stack.Screen name="FinancialReports" component={AnimatedFinancialReportsScreen} options={{ title: 'Financial Reports' }} />
      <Stack.Screen name="ProfitLossReport" component={AnimatedReportDetailScreen} initialParams={{ reportType: 'profit-loss' }} options={{ title: 'Profit & Loss' }} />
      <Stack.Screen name="BalanceSheetReport" component={AnimatedReportDetailScreen} initialParams={{ reportType: 'balance-sheet' }} options={{ title: 'Balance Sheet' }} />
      <Stack.Screen name="SalesReport" component={AnimatedReportDetailScreen} initialParams={{ reportType: 'sales' }} options={{ title: 'Sales Report' }} />
      <Stack.Screen name="GSTReport" component={AnimatedReportDetailScreen} initialParams={{ reportType: 'gst' }} options={{ title: 'GST Report' }} />
      <Stack.Screen name="CustomerReport" component={AnimatedReportDetailScreen} initialParams={{ reportType: 'customers' }} options={{ title: 'Customer Report' }} />
      <Stack.Screen name="VendorReport" component={AnimatedReportDetailScreen} initialParams={{ reportType: 'vendors' }} options={{ title: 'Vendor Report' }} />
      <Stack.Screen name="InventoryReport" component={AnimatedReportDetailScreen} initialParams={{ reportType: 'inventory' }} options={{ title: 'Inventory Report' }} />
      <Stack.Screen name="CustomerDebitCredit" component={AnimatedCustomerDebitCreditScreen} options={{ title: 'Debit/Credit Notes' }} />
      <Stack.Screen name="VendorDebitCredit" component={AnimatedVendorDebitCreditScreen} options={{ title: 'Debit/Credit Notes' }} />
      <Stack.Screen name="UserProfile" component={AnimatedUserProfileScreen} options={{ title: 'Profile' }} />
    </Stack.Navigator>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Products') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Customers') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Vendors') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else if (route.name === 'More') {
            iconName = focused ? 'menu' : 'menu-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '700',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={AnimatedDashboardScreen} />
      <Tab.Screen
        name="Products"
        component={AnimatedProductsScreen}
        options={{ title: 'Inventory', tabBarLabel: 'Inventory' }}
      />
      <Tab.Screen name="Customers" component={AnimatedCustomersScreen} />
      <Tab.Screen name="Vendors" component={AnimatedVendorsScreen} />
      <Tab.Screen name="More" component={AnimatedMoreMenuScreen} />
    </Tab.Navigator>
  );
};

const MainNavigator = () => {
  return <RootStack />;
};

export default MainNavigator;
