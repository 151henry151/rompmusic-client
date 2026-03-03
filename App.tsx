/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MD3DarkTheme, PaperProvider } from 'react-native-paper';

import AppNavigator from './src/navigation/AppNavigator';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { useAuthStore } from './src/store/authStore';
import { usePlayerStore } from './src/store/playerStore';
import { useServerStore } from './src/store/serverStore';
import { useSettingsStore } from './src/store/settingsStore';
import { initAudio } from './src/services/audioService';

const queryClient = new QueryClient();

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
    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        usePlayerStore.getState().onAppBackground();
      } else if (nextState === 'active') {
        usePlayerStore.getState().onAppActive();
      }
    };
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  return <AppNavigator />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={MD3DarkTheme}>
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
