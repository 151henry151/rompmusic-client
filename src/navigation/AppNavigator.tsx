/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { Platform } from 'react-native';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';
import { IconButton } from 'react-native-paper';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import LibraryScreen from '../screens/LibraryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import PlayerScreen from '../screens/PlayerScreen';
import ArtistDetailScreen from '../screens/ArtistDetailScreen';
import AlbumDetailScreen from '../screens/AlbumDetailScreen';
import TrackDetailScreen from '../screens/TrackDetailScreen';
import MiniPlayer from '../components/MiniPlayer';
import { useAuthStore } from '../store/authStore';
import { usePlayerStore, type Track } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import type { RootStackParamList, AppStackParamList } from './types';
import { getWebBasePath } from '../utils/webBasePath';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
});

function AuthenticatedLayout() {
  const insets = useSafeAreaInsets();
  const [showPlayer, setShowPlayer] = React.useState(false);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const prevTrackRef = React.useRef<Track | null>(null);
  const restoreSettings = useSettingsStore((s) => s.restoreSettings);
  const fetchClientConfig = useSettingsStore((s) => s.fetchClientConfig);

  React.useEffect(() => {
    restoreSettings();
    fetchClientConfig();
  }, [restoreSettings, fetchClientConfig]);

  React.useEffect(() => {
    if (currentTrack && !prevTrackRef.current) {
      setShowPlayer(true);
    }
    prevTrackRef.current = currentTrack;
  }, [currentTrack]);

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      <AppStack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { flex: 1 },
        }}
      >
        <AppStack.Screen name="Library" component={LibraryScreen} />
        <AppStack.Screen
          name="History"
          component={HistoryScreen}
          options={{ headerShown: false }}
        />
        <AppStack.Screen
          name="Settings"
          component={SettingsScreen}
          options={({ navigation }) => ({
            headerShown: true,
            headerTitle: 'Settings',
            headerStyle: { backgroundColor: '#0a0a0a' },
            headerTintColor: '#fff',
            headerLeft: () => (
              <IconButton
                icon="arrow-left"
                iconColor="#fff"
                onPress={() => navigation.goBack()}
                accessibilityLabel="Back"
              />
            ),
          })}
        />
        <AppStack.Screen
          name="ArtistDetail"
          component={ArtistDetailScreen}
          options={{ headerShown: true, headerTitle: '', headerBackTitle: 'Back', headerStyle: { backgroundColor: '#0a0a0a' }, headerTintColor: '#fff' }}
        />
        <AppStack.Screen
          name="AlbumDetail"
          component={AlbumDetailScreen}
          options={{ headerShown: true, headerTitle: '', headerBackTitle: 'Back', headerStyle: { backgroundColor: '#0a0a0a' }, headerTintColor: '#fff' }}
        />
        <AppStack.Screen
          name="TrackDetail"
          component={TrackDetailScreen}
          options={{ headerShown: true, headerTitle: '', headerBackTitle: 'Back', headerStyle: { backgroundColor: '#0a0a0a' }, headerTintColor: '#fff' }}
        />
        <AppStack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ headerShown: true, headerTitle: 'Change password', headerBackTitle: 'Back', headerStyle: { backgroundColor: '#0a0a0a' }, headerTintColor: '#fff' }}
        />
        <AppStack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
          options={{ headerShown: true, headerTitle: 'Reset password', headerBackTitle: 'Back', headerStyle: { backgroundColor: '#0a0a0a' }, headerTintColor: '#fff' }}
        />
      </AppStack.Navigator>
      {showPlayer && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <PlayerScreen onClose={() => setShowPlayer(false)} />
        </View>
      )}
      <MiniPlayer onExpand={() => setShowPlayer(true)} />
    </View>
  );
}

export default function AppNavigator() {
  const { isReady } = useAuthStore();

  if (!isReady) return null;

  const webBasePath = Platform.OS === 'web' ? getWebBasePath() : 'app';
  const linking = Platform.OS === 'web' && typeof window !== 'undefined'
    ? {
        prefixes: [window.location.origin + '/' + webBasePath, '/' + webBasePath],
        config: {
          screens: {
            App: {
              path: '',
              screens: {
                Library: '',
                History: 'history',
                Settings: 'settings',
                ArtistDetail: 'artist/:artistIds',
                AlbumDetail: 'album/:albumId',
                TrackDetail: 'track/:trackId',
                // ForgotPassword/ResetPassword exist at root too; omit here to avoid duplicate pattern
              },
            },
            Login: 'login',
            Register: 'register',
            VerifyEmail: 'verify-email',
            ForgotPassword: 'forgot-password',
            ResetPassword: 'reset-password',
          },
        },
      }
    : undefined;

  return (
    <NavigationContainer
      linking={linking}
      theme={{
        ...DarkTheme,
        colors: {
          primary: '#4a9eff',
          background: '#0a0a0a',
          card: '#0a0a0a',
          text: '#fff',
          border: '#333',
          notification: '#4a9eff',
        },
      }}
    >
      <RootStack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName="App"
      >
        <RootStack.Screen name="App" component={AuthenticatedLayout} />
        <RootStack.Screen name="Login" component={LoginScreen} />
        <RootStack.Screen name="Register" component={RegisterScreen} />
        <RootStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <RootStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
