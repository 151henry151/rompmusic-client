/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, List, Button } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { usePlayerStore } from '../store/playerStore';

export default function HomeScreen() {
  const { data: artists, isLoading } = useQuery({
    queryKey: ['artists'],
    queryFn: () => api.getArtists({ limit: 20 }),
  });
  const playTrack = usePlayerStore((s) => s.playTrack);

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineSmall" style={styles.header}>
        Artists
      </Text>
      {isLoading ? (
        <Text style={styles.muted}>Loading...</Text>
      ) : (
        (artists || []).map((a: { id: number; name: string }) => (
          <List.Item
            key={a.id}
            title={a.name}
            onPress={() => {}}
            style={styles.item}
          />
        ))
      )}
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
  muted: {
    padding: 16,
    color: '#666',
  },
  item: {
    backgroundColor: '#1a1a1a',
  },
});
