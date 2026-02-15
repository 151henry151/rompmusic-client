/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, SegmentedButtons, List } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { usePlayerStore } from '../store/playerStore';

export default function LibraryScreen() {
  const [tab, setTab] = useState<'artists' | 'albums'>('artists');
  const playTrack = usePlayerStore((s) => s.playTrack);

  const { data: artists } = useQuery({
    queryKey: ['artists'],
    queryFn: () => api.getArtists({ limit: 100 }),
  });
  const { data: albums } = useQuery({
    queryKey: ['albums'],
    queryFn: () => api.getAlbums({ limit: 100 }),
  });

  const handlePlayAlbum = async (albumId: number) => {
    const tracks = await api.getTracks({ album_id: albumId });
    if (tracks.length > 0) {
      await playTrack(tracks[0], tracks);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <SegmentedButtons
        value={tab}
        onValueChange={(v) => setTab(v as 'artists' | 'albums')}
        buttons={[
          { value: 'artists', label: 'Artists' },
          { value: 'albums', label: 'Albums' },
        ]}
        style={styles.segmented}
      />
      {tab === 'artists' &&
        (artists || []).map((a: { id: number; name: string }) => (
          <List.Item key={a.id} title={a.name} style={styles.item} />
        ))}
      {tab === 'albums' &&
        (albums || []).map(
          (a: { id: number; title: string; artist_name?: string }) => (
            <List.Item
              key={a.id}
              title={a.title}
              description={a.artist_name}
              onPress={() => handlePlayAlbum(a.id)}
              style={styles.item}
            />
          )
        )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  segmented: {
    margin: 16,
  },
  item: {
    backgroundColor: '#1a1a1a',
  },
});
