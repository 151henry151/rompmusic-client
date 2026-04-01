/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MD3DarkTheme, PaperProvider } from 'react-native-paper';

import AppNavigator from './src/navigation/AppNavigator';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { useAuthStore } from './src/store/authStore';
import { usePlayerStore } from './src/store/playerStore';
import { useServerStore } from './src/store/serverStore';
import { useSettingsStore } from './src/store/settingsStore';
import { useOfflineStore } from './src/store/offlineStore';
import { useNetworkStore, startNetworkMonitoring } from './src/hooks/useNetworkStatus';
import { initAudio } from './src/services/audioService';
import { initAndroidTrackPlayer } from './src/services/androidTrackPlayer';

// Tell React Query about our online status so it pauses queries when offline
// instead of retrying and showing errors.
onlineManager.setEventListener((setOnline) => {
  return useNetworkStore.subscribe((state) => setOnline(state.isOnline));
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry network errors when offline
        if (!useNetworkStore.getState().isOnline) return false;
        const msg = error instanceof Error ? error.message : '';
        if (msg.includes('Network request failed') || msg.includes('Failed to fetch')) return false;
        return failureCount < 2;
      },
      // Keep stale data visible while refetching (prevents flash of error)
      staleTime: 5 * 60 * 1000,
    },
  },
});

function AppContent() {
  const restoreServerUrl = useServerStore((s) => s.restoreServerUrl);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const restoreSettings = useSettingsStore((s) => s.restoreSettings);

  useEffect(() => {
    const runTask = async (label: string, task: () => Promise<void>, timeoutMs = 8000) => {
      try {
        await Promise.race([
          task(),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
          ),
        ]);
      } catch (error) {
        console.error(`${label} failed`, error);
      }
    };

    (async () => {
      // Restore persisted app state first so navigation can render promptly.
      await Promise.allSettled([
        runTask('Server URL restoration', restoreServerUrl, 5000),
        runTask('Session restoration', restoreSession, 9000),
        runTask('Settings restoration', restoreSettings, 5000),
      ]);

      // Hydrate offline store early so cached library is available before first render.
      await runTask('Offline store hydration', () => useOfflineStore.getState().hydrate(), 3000);

      // Start network connectivity monitoring
      startNetworkMonitoring();

      // Audio stack initialization should never block initial app render.
      void runTask('Android TrackPlayer initialization', initAndroidTrackPlayer);
      void runTask('Audio initialization', initAudio);

      // Background: refresh the library metadata cache when online.
      void runTask('Library metadata caching', () => useOfflineStore.getState().cacheLibraryMetadata(), 120000);
    })();
  }, [restoreServerUrl, restoreSession, restoreSettings]);

  useEffect(() => {
    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background') {
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
