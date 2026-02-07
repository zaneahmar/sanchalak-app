import axios from 'axios';

// Update this to your backend URL
// For local development: use your machine's IP address
// For production: use your production URL
const API_BASE_URL = 'http://192.168.1.3:5000/api'; // Change this to your backend IP

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export default api;
