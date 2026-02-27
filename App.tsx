/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { configureFonts, MD2DarkTheme, PaperProvider } from 'react-native-paper';

import AppNavigator from './src/navigation/AppNavigator';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { useAuthStore } from './src/store/authStore';
import { useSettingsStore } from './src/store/settingsStore';
import { useServerStore } from './src/store/serverStore';
import { initAudio } from './src/services/audioService';

const queryClient = new QueryClient();

const fontConfig = {
  web: {
    regular: { fontFamily: 'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif', fontWeight: '400' as const },
    medium: { fontFamily: 'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif', fontWeight: '500' as const },
    light: { fontFamily: 'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif', fontWeight: '300' as const },
    thin: { fontFamily: 'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif', fontWeight: '100' as const },
  },
  ios: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    light: { fontFamily: 'System', fontWeight: '300' as const },
    thin: { fontFamily: 'System', fontWeight: '100' as const },
  },
  android: {
    regular: { fontFamily: 'sans-serif', fontWeight: 'normal' as const },
    medium: { fontFamily: 'sans-serif-medium', fontWeight: 'normal' as const },
    light: { fontFamily: 'sans-serif-light', fontWeight: 'normal' as const },
    thin: { fontFamily: 'sans-serif-thin', fontWeight: 'normal' as const },
  },
} as const;

const theme = {
  ...MD2DarkTheme,
  fonts: configureFonts({ config: fontConfig, isV3: false }),
};

function AppContent() {
  const restoreServerUrl = useServerStore((s) => s.restoreServerUrl);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const restoreSettings = useSettingsStore((s) => s.restoreSettings);

  useEffect(() => {
    (async () => {
      try {
        await initAudio();
      } catch (error) {
        console.error('Audio initialization failed', error);
      }

      try {
        await restoreServerUrl();
      } catch (error) {
        console.error('Server URL restoration failed', error);
      }
      try {
        await restoreSession();
      } catch (error) {
        console.error('Session restoration failed', error);
      }
      try {
        await restoreSettings();
      } catch (error) {
        console.error('Settings restoration failed', error);
      }
    })();
  }, [restoreServerUrl, restoreSession, restoreSettings]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'ROMPMUSIC';
    }
  }, []);

  return <AppNavigator />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <AppErrorBoundary>
            <AppContent />
          </AppErrorBoundary>
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
