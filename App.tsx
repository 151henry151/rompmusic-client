/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MD3DarkTheme, PaperProvider } from 'react-native-paper';

import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import { initAudio } from './src/services/audioService';

const queryClient = new QueryClient();

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
      <PaperProvider theme={MD3DarkTheme}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <AppContent />
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
