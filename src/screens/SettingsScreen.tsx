/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, List, Button } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineSmall" style={styles.header}>
        Settings
      </Text>

      <Text variant="titleSmall" style={styles.section}>
        Account
      </Text>
      <List.Item
        title="Profile"
        description={user ? user.username : 'Not logged in'}
        left={() => <List.Icon icon="account" />}
        style={styles.item}
      />
      <List.Item
        title="Account"
        description="Manage your account"
        left={() => <List.Icon icon="account-cog" />}
        style={styles.item}
      />

      <Text variant="titleSmall" style={styles.section}>
        Playback
      </Text>
      <List.Item
        title="Gapless playback"
        description="Seamless transition between tracks"
        left={() => <List.Icon icon="music" />}
        style={styles.item}
      />
      <List.Item
        title="Audio quality"
        description="Stream at original quality"
        left={() => <List.Icon icon="quality-high" />}
        style={styles.item}
      />

      <Text variant="titleSmall" style={styles.section}>
        About
      </Text>
      <List.Item
        title="About"
        description="RompMusic 0.1.0-beta.1"
        left={() => <List.Icon icon="information" />}
        style={styles.item}
      />
      <List.Item
        title="Privacy"
        description="Privacy policy and data usage"
        left={() => <List.Icon icon="shield-account" />}
        style={styles.item}
      />

      <Button mode="contained" onPress={logout} style={styles.logout}>
        Log out
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    padding: 16,
    color: '#fff',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    color: '#888',
  },
  item: {
    backgroundColor: '#1a1a1a',
  },
  logout: {
    margin: 16,
  },
});
