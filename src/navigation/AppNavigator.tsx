/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import SearchScreen from '../screens/SearchScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PlayerScreen from '../screens/PlayerScreen';
import MiniPlayer from '../components/MiniPlayer';
import { useAuthStore } from '../store/authStore';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const [showPlayer, setShowPlayer] = React.useState(false);

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      {showPlayer && (
        <View style={StyleSheet.absoluteFill}>
          <PlayerScreen onClose={() => setShowPlayer(false)} />
        </View>
      )}
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
        dark: true,
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
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
