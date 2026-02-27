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
          <AppErrorBoundary>
            <AppContent />
          </AppErrorBoundary>
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
>
  );
}
  </PaperProvider>
    </QueryClientProvider>
  );
}
lex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a', padding: 24 },
        text: { color: '#fff', fontSize: 18, marginBottom: 8 },
        subtext: { color: '#888', fontSize: 14, textAlign: 'center' },
      });
      return (
        <View style={styles.container}>
          <Text style={styles.text}>Something went wrong.</Text>
          <Text style={styles.subtext}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

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
          <AppErrorBoundary>
            <AppContent />
          </AppErrorBoundary>
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
