const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const bunyan = require('bunyan');
require('dotenv').config();
const dbInit = require('./config/initDb');
const seedData = require('./config/seedData');
const addPaymentTrackingColumns = require('./config/addPaymentTrackingColumns');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Define allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost',
      'http://localhost:80',
      process.env.CLIENT_URL
    ].filter(Boolean); // Remove undefined values
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now, or set to false for strict mode
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Logging
const log = bunyan.createLogger({
name: 'sanchalak-app',
serializers: {
  req: bunyan.stdSerializers.req
}
});

// Log incoming requests
app.use((req, res, next) => {
log.info({ req }, 'REQUEST');
next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Backend is running' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/purchase-orders', require('./routes/purchaseOrders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/debit-credit', require('./routes/debitCredit'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal Server Error' 
  });
});

app.listen(PORT, () => {
  try{
    // dbInit();
    // addPaymentTrackingColumns();
    // seedData();
    console.log(`Server is running on port ${PORT}`);
  }catch(err){
    console.error('Database initialization failed:', err);
  }
});
