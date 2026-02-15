/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { configureFonts, MD2DarkTheme, PaperProvider } from 'react-native-paper';

import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
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
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => {
    initAudio().catch(() => {});
    restoreSession();
  }, [restoreSession]);

  return <AppNavigator />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <AppContent />
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
