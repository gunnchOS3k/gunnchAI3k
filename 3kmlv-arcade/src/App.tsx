// 3kMLV Arcade - Main App Component
// Ultra-High Performance Gaming Platform

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { GameEmulationEngine } from './core/GameEmulationEngine';
import { EdgeIOIntegration } from './core/EdgeIOIntegration';
import { PerformanceEngine } from './core/PerformanceEngine';
import { HomeScreen } from './screens/HomeScreen';
import { GameLibraryScreen } from './screens/GameLibraryScreen';
import { EmulatorScreen } from './screens/EmulatorScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { CloudGamingScreen } from './screens/CloudGamingScreen';
import { PerformanceScreen } from './screens/PerformanceScreen';
import { LoadingScreen } from './screens/LoadingScreen';
import { ErrorScreen } from './screens/ErrorScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize core engines
      const emulationEngine = GameEmulationEngine.getInstance();
      const edgeIO = EdgeIOIntegration.getInstance();
      const performanceEngine = PerformanceEngine.getInstance();

      // Initialize performance engine first
      await performanceEngine.initialize();
      await performanceEngine.optimize();
      await performanceEngine.startMonitoring();

      // Initialize emulation engine
      await emulationEngine.initialize();

      // Initialize EdgeIO integration
      await edgeIO.initialize({
        apiKey: process.env.EDGEIO_API_KEY || '',
        region: 'auto',
        streamingQuality: 'ultra'
      });

      await edgeIO.connect();

      setIsInitialized(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} onRetry={initializeApp} />;
  }

  return (
    <Provider store={store}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarStyle: {
                backgroundColor: '#1a1a1a',
                borderTopColor: '#333',
                borderTopWidth: 1,
                height: 60,
                paddingBottom: 5,
                paddingTop: 5
              },
              tabBarActiveTintColor: '#00ff88',
              tabBarInactiveTintColor: '#666',
              tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: '600'
              }
            }}
          >
            <Tab.Screen
              name="Home"
              component={HomeScreen}
              options={{
                tabBarLabel: 'Home',
                tabBarIcon: ({ color }) => (
                  <Text style={[styles.tabIcon, { color }]}>🏠</Text>
                )
              }}
            />
            <Tab.Screen
              name="Library"
              component={GameLibraryScreen}
              options={{
                tabBarLabel: 'Library',
                tabBarIcon: ({ color }) => (
                  <Text style={[styles.tabIcon, { color }]}>🎮</Text>
                )
              }}
            />
            <Tab.Screen
              name="Emulator"
              component={EmulatorScreen}
              options={{
                tabBarLabel: 'Emulator',
                tabBarIcon: ({ color }) => (
                  <Text style={[styles.tabIcon, { color }]}>⚡</Text>
                )
              }}
            />
            <Tab.Screen
              name="Cloud"
              component={CloudGamingScreen}
              options={{
                tabBarLabel: 'Cloud',
                tabBarIcon: ({ color }) => (
                  <Text style={[styles.tabIcon, { color }]}>☁️</Text>
                )
              }}
            />
            <Tab.Screen
              name="Performance"
              component={PerformanceScreen}
              options={{
                tabBarLabel: 'Perf',
                tabBarIcon: ({ color }) => (
                  <Text style={[styles.tabIcon, { color }]}>📊</Text>
                )
              }}
            />
            <Tab.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                tabBarLabel: 'Settings',
                tabBarIcon: ({ color }) => (
                  <Text style={[styles.tabIcon, { color }]}>⚙️</Text>
                )
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  tabIcon: {
    fontSize: 20,
    textAlign: 'center'
  }
});
