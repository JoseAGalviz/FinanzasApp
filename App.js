import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported',
]);

const _consoleError = console.error.bind(console);
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('expo-notifications')) return;
  _consoleError(...args);
};

const _consoleWarn = console.warn.bind(console);
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('expo-notifications')) return;
  _consoleWarn(...args);
};
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { initDatabase, processRecurringTransactions } from './src/database/db';
import { AppProvider, useApp } from './src/context/AppContext';
import { AppNavigator } from './src/navigation/AppNavigator';

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#10B981" />
      <Text style={styles.loadingText}>Cargando...</Text>
    </View>
  );
}

function AppWithNav() {
  const { colors, isDark } = useApp();
  return (
    <NavigationContainer
      theme={{
        dark: isDark,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.primary,
        },
      }}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        await initDatabase();
        await processRecurringTransactions();
        setIsDbReady(true);
      } catch (e) {
        console.error('Database initialization failed:', e);
        setError(e.message);
      }
    }
    init();
  }, []);

  if (error) {
    return (
      <View style={[styles.loading, { backgroundColor: '#0F172A' }]}>
        <Text style={[styles.loadingText, { color: '#EF4444' }]}>Error al iniciar: {error}</Text>
      </View>
    );
  }

  if (!isDbReady) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <AppWithNav />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 16,
  },
});
