import api from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const authService = {
  // Set auth token for all requests
  setAuthToken: async (token) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      await AsyncStorage.setItem('token', token);
    } else {
      delete api.defaults.headers.common['Authorization'];
      await AsyncStorage.removeItem('token');
    }
  },

  // Get stored token
  getToken: async () => {
    try {
      return await AsyncStorage.getItem('token');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  // Login
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    if (response.data.token) {
      await authService.setAuthToken(response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Register
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.user) {
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Logout
  logout: async () => {
    await authService.setAuthToken(null);
    await AsyncStorage.removeItem('user');
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await api.put('/auth/update-profile', profileData);
    if (response.data?.user) {
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
};

export default authService;
