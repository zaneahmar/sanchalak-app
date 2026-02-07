# Sanchalak App - Backend API

Node.js and Express backend with PostgreSQL database for the Sanchalak App.

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory by copying `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your PostgreSQL credentials:
```
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shine_shoe_db
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

5. Create the PostgreSQL database:
```bash
createdb shine_shoe_db
```

## Running the Backend

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will run on `http://localhost:5000` by default.

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order by ID with items
- `GET /api/orders/customer/:customerId` - Get orders by customer
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

### Inventory
- `GET /api/inventory` - Get all inventory
- `GET /api/inventory/:productId` - Get inventory by product ID
- `POST /api/inventory` - Create inventory entry
- `PUT /api/inventory/:productId` - Update inventory
- `DELETE /api/inventory/:productId` - Delete inventory

### Sales
- `GET /api/sales` - Get all sales
- `GET /api/sales/date-range?startDate=&endDate=` - Get sales by date range
- `GET /api/sales/summary` - Get sales summary
- `POST /api/sales` - Create new sale

### Billing
- `GET /api/billing` - Get all billing records
- `GET /api/billing/:id` - Get billing record by ID
- `GET /api/billing/customer/:customerId` - Get billing by customer ID
- `POST /api/billing` - Create billing record
- `PUT /api/billing/:id` - Update billing record
- `DELETE /api/billing/:id` - Delete billing record

## Database Schema

The backend automatically initializes the database with the following tables:
- `customers` - Customer information
- `products` - Product catalog
- `orders` - Customer orders
- `order_items` - Individual items in orders
- `inventory` - Product inventory tracking
- `sales` - Sales records
- `billing` - Billing and invoicing information

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js - Database connection
│   │   └── initDb.js - Database initialization
│   ├── models/
│   │   ├── Customer.js - Customer model
│   │   ├── Product.js - Product model
│   │   └── Order.js - Order model
│   ├── routes/
│   │   ├── products.js
│   │   ├── customers.js
│   │   ├── orders.js
│   │   ├── inventory.js
│   │   ├── sales.js
│   │   └── billing.js
│   └── server.js - Main Express server
├── .env.example
└── package.json
```

## Environment Variables

- `DB_USER` - PostgreSQL username
- `DB_PASSWORD` - PostgreSQL password
- `DB_HOST` - PostgreSQL host
- `DB_PORT` - PostgreSQL port
- `DB_NAME` - PostgreSQL database name
- `PORT` - Express server port
- `NODE_ENV` - Environment (development/production)
- `CLIENT_URL` - Frontend URL for CORS

## Technologies Used

- **Express.js** - Web framework
- **PostgreSQL** - Database
- **pg** - PostgreSQL client for Node.js
- **CORS** - Cross-origin resource sharing
- **Dotenv** - Environment variables management
- **Nodemon** - Development auto-reload
