/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import SearchScreen from '../screens/SearchScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PlayerScreen from '../screens/PlayerScreen';
import ArtistDetailScreen from '../screens/ArtistDetailScreen';
import AlbumDetailScreen from '../screens/AlbumDetailScreen';
import TrackDetailScreen from '../screens/TrackDetailScreen';
import MiniPlayer from '../components/MiniPlayer';
import { useAuthStore } from '../store/authStore';
import { usePlayerStore, type Track } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
});

function MainTabs() {
  return (
    <View style={styles.wrapper}>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0a0a0a' },
          headerTintColor: '#fff',
          tabBarStyle: { backgroundColor: '#0a0a0a' },
          tabBarActiveTintColor: '#4a9eff',
          tabBarInactiveTintColor: '#666',
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarIcon: ({ color, size }) => <Icon source="home" color={color} size={size} /> }}
        />
        <Tab.Screen
          name="Search"
          component={SearchScreen}
          options={{ tabBarIcon: ({ color, size }) => <Icon source="magnify" color={color} size={size} /> }}
        />
        <Tab.Screen
          name="Library"
          component={LibraryScreen}
          options={{ tabBarIcon: ({ color, size }) => <Icon source="music-box-multiple" color={color} size={size} /> }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ tabBarIcon: ({ color, size }) => <Icon source="cog" color={color} size={size} /> }}
        />
      </Tab.Navigator>
    </View>
  );
}

function AuthenticatedLayout() {
  const insets = useSafeAreaInsets();
  const [showPlayer, setShowPlayer] = React.useState(false);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const prevTrackRef = React.useRef<Track | null>(null);
  const restoreSettings = useSettingsStore((s) => s.restoreSettings);

  React.useEffect(() => {
    restoreSettings();
  }, [restoreSettings]);

  React.useEffect(() => {
    if (currentTrack && !prevTrackRef.current) {
      setShowPlayer(true);
    }
    prevTrackRef.current = currentTrack;
  }, [currentTrack]);

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="ArtistDetail"
          component={ArtistDetailScreen}
          options={{ headerShown: true, headerTitle: '', headerBackTitle: 'Back', headerStyle: { backgroundColor: '#0a0a0a' }, headerTintColor: '#fff' }}
        />
        <Stack.Screen
          name="AlbumDetail"
          component={AlbumDetailScreen}
          options={{ headerShown: true, headerTitle: '', headerBackTitle: 'Back', headerStyle: { backgroundColor: '#0a0a0a' }, headerTintColor: '#fff' }}
        />
        <Stack.Screen
          name="TrackDetail"
          component={TrackDetailScreen}
          options={{ headerShown: true, headerTitle: '', headerBackTitle: 'Back', headerStyle: { backgroundColor: '#0a0a0a' }, headerTintColor: '#fff' }}
        />
      </Stack.Navigator>
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
  const { user, isReady } = useAuthStore();

  if (!isReady) return null;

  return (
    <NavigationContainer
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
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        ) : (
          <Stack.Screen name="App" component={AuthenticatedLayout} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
