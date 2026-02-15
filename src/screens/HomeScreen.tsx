/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, List } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/client';

type RootStackParamList = { ArtistDetail: { artistId: number; artistName: string } };

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'ArtistDetail'>>();
  const { data: artists, isLoading } = useQuery({
    queryKey: ['artists'],
    queryFn: () => api.getArtists({ limit: 20 }),
  });

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
            onPress={() => navigation.navigate('ArtistDetail', { artistId: a.id, artistName: a.name })}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            style={styles.item}
            accessibilityRole="button"
            accessibilityLabel={`View ${a.name}`}
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
