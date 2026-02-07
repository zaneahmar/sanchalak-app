# Sanchalak Mobile App

React Native mobile application for the Sanchalak business management system.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Studio (for Android development)
- Physical device with Expo Go app (optional)

## Installation

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

## Configuration

### Backend Connection

Update the backend URL in `src/config/api.js`:

```javascript
const API_BASE_URL = 'http://YOUR_IP_ADDRESS:5000/api';
```

**Important:** 
- For local development on physical device, use your computer's IP address (not localhost)
- Find your IP: 
  - Mac/Linux: `ifconfig` or `ip addr show`
  - Windows: `ipconfig`
- Ensure your device and computer are on the same network
- Make sure backend is running and accessible

## Running the App

### Start the development server:
```bash
npm start
```

### Run on specific platform:
```bash
npm run android  # Android
npm run ios      # iOS (Mac only)
```

### Using Expo Go App:
1. Install Expo Go on your device from App Store or Play Store
2. Scan the QR code shown in terminal
3. App will load on your device

## Project Structure

```
mobile/
├── App.js                      # Root component
├── app.json                    # Expo configuration
├── package.json                # Dependencies
├── babel.config.js            # Babel configuration
└── src/
    ├── components/            # Reusable components
    │   ├── Card.js
    │   ├── CustomButton.js
    │   ├── CustomInput.js
    │   ├── LoadingSpinner.js
    │   └── ToasterContainer.js
    ├── config/
    │   └── api.js            # API configuration
    ├── context/              # Context providers
    │   ├── AuthContext.js
    │   ├── DataContext.js
    │   └── ToasterContext.js
    ├── navigation/           # Navigation setup
    │   ├── AppNavigator.js
    │   ├── AuthNavigator.js
    │   └── MainNavigator.js
    ├── screens/             # App screens
    │   ├── DashboardScreen.js
    │   ├── LoginScreen.js
    │   ├── RegisterScreen.js
    │   └── ProductsScreen.js
    └── services/           # API services
        ├── authService.js
        ├── customerService.js
        ├── orderService.js
        ├── productService.js
        └── vendorService.js
```

## Features

### Authentication
- User login and registration
- Secure token-based authentication
- Persistent sessions with AsyncStorage

### Dashboard
- Overview of business metrics
- Quick stats for products, customers, vendors, orders
- Quick action buttons
- Recent orders list

### Products Management
- View all products
- Add new products
- Edit existing products
- Delete products
- Low stock indicators

### Customers & Vendors
- Manage customer database
- Manage vendor relationships
- Contact information tracking

### Orders
- Create new orders
- View order history
- Update order status
- Order tracking

## Key Technologies

- **React Native**: Cross-platform mobile development
- **Expo**: Development and build toolchain
- **React Navigation**: Navigation library
- **Axios**: HTTP client for API calls
- **AsyncStorage**: Local data persistence
- **React Native Paper**: UI component library
- **Expo Vector Icons**: Icon library

## Development Tips

### Debugging
- Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android) to open developer menu
- Use React Native Debugger
- Check Metro bundler logs in terminal

### Hot Reload
- Changes are automatically reflected
- If not working, try:
  - Shake device and tap "Reload"
  - Press `r` in terminal

### Common Issues

1. **Can't connect to backend:**
   - Verify backend URL in `src/config/api.js`
   - Check if backend is running
   - Ensure device and computer on same network
   - Try your IP instead of localhost

2. **Module not found:**
   ```bash
   npm install
   expo start -c  # Clear cache
   ```

3. **Build errors:**
   ```bash
   rm -rf node_modules
   npm install
   expo start -c
   ```

## Building for Production

### Android (APK/AAB):
```bash
expo build:android
```

### iOS (IPA):
```bash
expo build:ios
```

Note: Building iOS apps requires Apple Developer account.

## API Integration

All API calls go through service files in `src/services/`. Each service:
- Handles specific resource (products, customers, etc.)
- Returns consistent response format: `{ success, data/error }`
- Uses centralized API configuration

## State Management

- **AuthContext**: User authentication state
- **DataContext**: Application data (products, customers, etc.)
- **ToasterContext**: Toast notifications

## Styling

- Uses React Native StyleSheet
- Consistent color scheme matching web app
- Responsive design for different screen sizes

## Next Steps

1. Add remaining screens (Customers, Vendors, Orders details)
2. Implement offline mode with local storage
3. Add push notifications
4. Implement barcode scanning for products
5. Add reports and analytics
6. Implement payment integration

## Support

For issues or questions, check:
- Backend API documentation
- React Native docs: https://reactnative.dev
- Expo docs: https://docs.expo.dev

## License

Private - All rights reserved
