import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import * as Updates from 'expo-updates';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';

// Suppress noisy dev warnings and old console logs from the LogBox overlay
LogBox.ignoreLogs([
  'Warning:',
  'VirtualizedLists should never be nested',
  'Non-serializable values were found in the navigation state',
  'Sending `onAnimatedValueUpdate`',
  '[Reanimated]',
  'Error refreshing',
  'Error fetching',
  'Error loading',
  'Console Error',
]);
LogBox.ignoreAllLogs(true); // Hide ALL LogBox popups — errors still print to Metro console

export default function App() {
  useEffect(() => {
    async function checkForUpdates() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (_) {
        // ไม่แสดง error ใน dev mode
      }
    }
    if (!__DEV__) {
      checkForUpdates();
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <LanguageProvider>
            <ThemeProvider>
              <NavigationContainer>
                <AppNavigator />
                <StatusBar style="dark" />
              </NavigationContainer>
            </ThemeProvider>
          </LanguageProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
