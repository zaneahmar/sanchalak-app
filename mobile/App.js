import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import { ToasterProvider } from './src/context/ToasterContext';
import AppNavigator from './src/navigation/AppNavigator';
import ToasterContainer from './src/components/ToasterContainer';
import { useData } from './src/context/DataContext';

const AppContent = () => {
  const { isBlurred, toggleBlur } = useData();

  return (
    <View style={styles.appContainer}>
      <AppNavigator />

      {isBlurred && (
        <View style={styles.blurOverlay} pointerEvents="auto">
          <BlurView intensity={35} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.blurCard}>
            <Ionicons name="lock-closed" size={36} color="#1f2937" />
            <Text style={styles.blurTitle}>Screen Locked</Text>
            <Text style={styles.blurSubtitle}>Tap below to unlock</Text>
            <TouchableOpacity style={styles.unlockButton} onPress={toggleBlur}>
              <Text style={styles.unlockButtonText}>Unlock</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ToasterContainer />
      <StatusBar style="auto" />
    </View>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <AuthProvider>
          <ToasterProvider>
            <DataProvider>
              <AppContent />
            </DataProvider>
          </ToasterProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appContainer: {
    flex: 1,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 999,
  },
  blurCard: {
    width: '78%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  blurTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  blurSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  unlockButton: {
    marginTop: 16,
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  unlockButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
