/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SegmentedButtons, List } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { usePlayerStore } from '../store/playerStore';

type RootStackParamList = { ArtistDetail: { artistId: number; artistName: string } };

export default function LibraryScreen() {
  const [tab, setTab] = useState<'artists' | 'albums'>('artists');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'ArtistDetail'>>();
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
          <List.Item
            key={a.id}
            title={a.name}
            onPress={() => navigation.navigate('ArtistDetail', { artistId: a.id, artistName: a.name })}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            style={styles.item}
            accessibilityRole="button"
            accessibilityLabel={`View ${a.name}`}
          />
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
              right={(props) => <List.Icon {...props} icon="play" />}
              accessibilityRole="button"
              accessibilityLabel={`Play album ${a.title}`}
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
