import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const { getTotalSales, getTotalOrders, getLowStockProducts, getTotalInventoryValue, inventory, sales, isBlurred } = useData();
  const [salesData, setSalesData] = useState([]);
  const [chartType, setChartType] = useState('line'); // 'line' or 'bar'

  const lowStockProducts = getLowStockProducts();
  const totalSales = getTotalSales() || 0;
  const totalOrders = getTotalOrders();
  const inventoryValue = getTotalInventoryValue() || 0;

  useEffect(() => {
    // Process sales data for the chart
    if (sales && sales.length > 0) {
      const salesByDate = {};
      
      sales.forEach(sale => {
        const date = new Date(sale.sale_date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short'
        });
        
        if (salesByDate[date]) {
          salesByDate[date] += parseFloat(sale.total_amount || 0);
        } else {
          salesByDate[date] = parseFloat(sale.total_amount || 0);
        }
      });

      // Convert to array and sort by date
      const chartData = Object.entries(salesByDate)
        .map(([date, amount]) => ({
          date,
          sales: parseFloat(amount.toFixed(2))
        }))
        .slice(-30); // Last 30 days

      setSalesData(chartData);
    }
  }, [sales]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{payload[0].payload.date}</p>
          <p className="tooltip-value">Sales: {payload[0].value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      {!isBlurred && (
        <>
          <div className="dashboard-stats">
            <div className="stat-card">
              <h3>Total Sales</h3>
              <p className="stat-value">{totalSales.toFixed(2)}</p>
            </div>
            
            <div className="stat-card">
              <h3>Total Orders</h3>
              <p className="stat-value">{totalOrders}</p>
            </div>
            
            <div className="stat-card">
              <h3>Total Products</h3>
              <p className="stat-value">{inventory.length}</p>
            </div>
            
            <div className="stat-card">
              <h3>Inventory Value</h3>
              <p className="stat-value">{inventoryValue.toFixed(2)}</p>
            </div>
          </div>

          {/* Sales Chart */}
          {salesData.length > 0 && (
            <div className="chart-container">
              <div className="chart-header">
                <h2>Daily Sales Overview</h2>
                <div className="chart-controls">
                  <button 
                    className={`chart-btn ${chartType === 'line' ? 'active' : ''}`}
                    onClick={() => setChartType('line')}
                  >
                    Line Chart
                  </button>
                  <button 
                    className={`chart-btn ${chartType === 'bar' ? 'active' : ''}`}
                    onClick={() => setChartType('bar')}
                  >
                    Bar Chart
                  </button>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={350}>
                {chartType === 'line' ? (
                  <LineChart data={salesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#718096"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis 
                      stroke="#718096"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#667eea" 
                      strokeWidth={3}
                      dot={{ fill: '#667eea', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Sales Amount"
                    />
                  </LineChart>
                ) : (
                  <BarChart data={salesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#718096"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis 
                      stroke="#718096"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar 
                      dataKey="sales" 
                      fill="#667eea"
                      radius={[8, 8, 0, 0]}
                      name="Sales Amount"
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          {lowStockProducts.length > 0 && (
            <div className="alerts">
              <h2>⚠️ Low Stock Alert</h2>
              <ul>
                {lowStockProducts.map(product => (
                  <li key={product.id}>
                    <strong>{product.name}</strong> - Only {product.stock} units left
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
