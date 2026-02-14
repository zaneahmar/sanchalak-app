# Sanchalak Store - Wholesale Management System

A modern, full-featured React application for managing a shoe wholesale business. This application helps you manage inventory, orders, sales, customers, and billing all in one place.

## Features

### 1. **Dashboard**
- Real-time overview of business metrics
- Total sales tracking
- Order count monitoring
- Total products in inventory
- Inventory value calculation
- Low stock alerts to prevent stockouts

### 2. **Inventory Management**
- Add, edit, and delete products
- Track product SKU, size, and color
- Monitor cost and selling prices
- Calculate profit margin percentage
- Real-time stock updates
- Low stock warnings

### 3. **Customer Management**
- Maintain a database of customers
- Store customer contact information (name, phone, email)
- Track business names and addresses
- City, state, and pincode information
- Easy customer card view
- Add, edit, and delete customers

### 4. **Order Management**
- Create orders for customers
- Select multiple products per order
- Adjust quantities
- Track order status (pending, processing, shipped, delivered, cancelled)
- Automatic inventory deduction when orders are created
- Full order history with details

### 5. **Sales Management**
- Record sales transactions
- Support for walk-in customers
- Multiple payment methods (Cash, Card, UPI, Bank Transfer, Cheque)
- Add notes to sales
- Track all sales with timestamps
- Sales history and reporting

### 6. **Billing & Invoicing**
- Generate invoices for all sales
- Filter sales by date range (Today, Last 7 days, Last 30 days, Custom)
- Filter by payment method
- Calculate revenue, cost, and profit
- Monitor profit margins
- Generate formatted invoices
- Detailed financial reports

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Start the development server:**
```bash
npm start
```

The application will open at `http://192.168.1.9:3000`

### Available Scripts

**Development:**
```bash
npm start
```

**Production Build:**
```bash
npm run build
```

**Testing:**
```bash
npm test
```

## Usage Guide

### Adding Your First Product
1. Navigate to **Inventory** from the top menu
2. Click **+ Add New Product**
3. Fill in product details:
   - Product Name
   - SKU (Stock Keeping Unit)
   - Size and Color
   - Cost Price and Selling Price
   - Stock Quantity
   - Description (optional)
4. Click **Add Product**

### Adding a Customer
1. Go to **Customers** section
2. Click **+ Add New Customer**
3. Enter customer details:
   - Full Name
   - Phone Number
   - Business Name (optional)
   - Email, Address, City, State, Pincode
4. Click **Add Customer**

### Creating an Order
1. Navigate to **Orders**
2. Click **+ Create New Order**
3. Select a customer
4. Add products and set quantities
5. Add order notes if needed
6. Click **Create Order**
7. The system will automatically update inventory

### Recording a Sale
1. Go to **Sales**
2. Click **+ New Sale**
3. Select a customer (optional for walk-in customers)
4. Choose payment method
5. Add products to the sale
6. Add any notes
7. Click **Complete Sale**

### Checking Billing & Invoices
1. Navigate to **Billing & Invoicing**
2. Filter by date range or payment method
3. View financial summaries (Revenue, Cost, Profit, Margin)
4. Click **View Invoice** to see invoice details

## Data Storage

All data is stored locally in your browser using **localStorage**. This means:
- Data persists even after closing the browser
- No internet connection required for operation
- Data is stored on the device only

### Important Notes:
- Clearing browser cache will delete all data
- Data is not backed up automatically
- For production use, consider migrating to a backend database

## Key Calculations

### Profit Margin
```
Margin = ((Selling Price - Cost Price) / Cost Price) × 100%
```

### Inventory Value
```
Total Inventory Value = Sum of (Product Price × Stock Quantity) for all products
```

### Profit per Sale
```
Profit = Sale Amount - (Sum of (Product Cost × Quantity) for all items)
```

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Technology Stack

- **React 19**: UI framework
- **React Router v6**: Navigation and routing
- **UUID**: Unique ID generation
- **CSS3**: Styling and responsive design
- **LocalStorage API**: Data persistence

## Project Structure

```
src/
├── context/
│   └── DataContext.js       # Global state management
├── pages/
│   ├── Dashboard.js         # Main dashboard
│   ├── Inventory.js         # Product management
│   ├── Customers.js         # Customer database
│   ├── Orders.js            # Order management
│   ├── Sales.js             # Sales tracking
│   └── Billing.js           # Invoicing & reports
├── styles/
│   ├── Dashboard.css
│   ├── Inventory.css
│   ├── Orders.css
│   ├── Sales.css
│   ├── Customers.css
│   └── Billing.css
├── App.js                   # Main app component
└── App.css                  # Main styles
```

## Future Enhancements

Potential features to add:
- PDF invoice generation and printing
- Database backend (MongoDB, Firebase, PostgreSQL)
- User authentication and multi-user support
- Product image uploads
- Barcode scanning
- SMS/Email notifications
- Advanced analytics and charts
- Mobile app version
- Multi-currency support
- Tax calculations (GST, etc.)

## Troubleshooting

### Data not saving?
- Check if localStorage is enabled in your browser
- Check browser console for errors

### Performance issues?
- Clear browser cache
- Try a different browser
- Close other applications

### Application not starting?
- Ensure Node.js is installed: `node --version`
- Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then reinstall

## License

Created for managing shoe wholesale business operations.

---

**Version**: 1.0.0  
**Last Updated**: December 2025

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
