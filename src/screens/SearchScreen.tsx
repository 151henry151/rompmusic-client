/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { TextInput, List, Text } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { usePlayerStore } from '../store/playerStore';

export default function SearchScreen() {
  const [q, setQ] = useState('');
  const playTrack = usePlayerStore((s) => s.playTrack);

  const { data, isLoading } = useQuery({
    queryKey: ['search', q],
    queryFn: () => api.search(q),
    enabled: q.length >= 2,
  });

  const handlePlay = async (trackId: number) => {
    const track = (data?.tracks || []).find((t: { id: number }) => t.id === trackId);
    if (track) await playTrack(track, data?.tracks || []);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          mode="outlined"
          placeholder="Search artists, albums, tracks"
          value={q}
          onChangeText={setQ}
          style={styles.search}
          left={<TextInput.Icon icon="magnify" />}
          right={q ? <TextInput.Icon icon="close" onPress={() => setQ('')} /> : undefined}
          accessibilityLabel="Search artists, albums, tracks"
        />
      </View>
      {q.length < 2 && (
        <Text style={styles.hint}>Type at least 2 characters to search</Text>
      )}
      {isLoading && <Text style={styles.muted}>Searching...</Text>}
      {data?.tracks?.length > 0 && (
        <>
          <Text variant="titleSmall" style={styles.section}>
            Tracks
          </Text>
          {(data.tracks || []).map((t: { id: number; title: string; artist_name?: string }) => (
            <List.Item
              key={t.id}
              title={t.title}
              description={t.artist_name}
              onPress={() => handlePlay(t.id)}
              style={styles.item}
              right={(props) => <List.Icon {...props} icon="play" />}
              accessibilityRole="button"
              accessibilityLabel={`Play ${t.title} by ${t.artist_name || 'Unknown'}`}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  searchRow: { padding: 16 },
  search: { backgroundColor: '#1a1a1a' },
  hint: { padding: 16, color: '#666' },
  muted: { padding: 16, color: '#888' },
  section: { padding: 16, color: '#fff' },
  item: { backgroundColor: '#1a1a1a' },
});
