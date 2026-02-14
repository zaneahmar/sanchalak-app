import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { setTokenExpiredCallback } from '../services/api';

const AuthContext = createContext();

// Constants
const INACTIVITY_TIMEOUT = 300 * 1000; // 5 minutes in milliseconds

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const inactivityTimerRef = useRef(null);
  const dataContextClearRef = useRef(null);

  // Method to register DataContext's clear function
  const registerDataContextClear = (clearFn) => {
    dataContextClearRef.current = clearFn;
  };

  // Check if user is already logged in on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  // Setup token expiration callback
  useEffect(() => {
    // Set callback to handle token expiration from API responses
    setTokenExpiredCallback((errorMessage) => {
      // Dispatch custom event for token expiration
      window.dispatchEvent(new CustomEvent('tokenExpired', { 
        detail: { message: errorMessage } 
      }));
    });

    return () => {
      setTokenExpiredCallback(null);
    };
  }, []);
  const resetInactivityTimer = () => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Set new timer only if user is authenticated
    if (isAuthenticated && token) {
      inactivityTimerRef.current = setTimeout(() => {
        console.log('User inactive for 1 minute. Logging out...');
        logout();
      }, INACTIVITY_TIMEOUT);
    }
  };

  // Setup activity listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });

    // Initial timer setup
    resetInactivityTimer();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [isAuthenticated, token]);

  const login = async (username, password) => {
    try {
      setLoading(true);
      const response = await fetch('http://192.168.1.9:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const clearBrowserCache = async () => {
    try {
      // Clear all localStorage
      localStorage.clear();
      
      // Clear all sessionStorage
      sessionStorage.clear();
      
      // Clear all cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // Clear Cache Storage API (Service Worker caches)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        const dbs = await indexedDB.databases();
        dbs.forEach(db => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      }
      
      console.log('Browser cache cleared successfully');
    } catch (error) {
      console.error('Error clearing browser cache:', error);
    }
  };

  const logout = async (message = null) => {
    try {
      // Clear inactivity timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      setLoading(true);
      await fetch('http://192.168.1.9:5000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      
      // Clear DataContext data if available
      if (dataContextClearRef.current) {
        dataContextClearRef.current();
      }
      
      // Clear all browser cache and storage
      await clearBrowserCache();
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'Logout failed' };
    } finally {
      setLoading(false);
    }
  };

  const refreshUserProfile = async () => {
    try {
      if (!token) {
        return { success: false, message: 'No token available' };
      }

      const response = await fetch('http://192.168.1.9:5000/api/auth/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('User profile refreshed:', data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Profile refresh error:', error);
      return { success: false, message: 'Failed to refresh profile' };
    }
  };

  const updateUserProfile = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    isAuthenticated,
    user,
    token,
    loading,
    login,
    logout,
    refreshUserProfile,
    updateUserProfile,
    registerDataContextClear,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
