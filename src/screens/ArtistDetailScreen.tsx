/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, List } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { usePlayerStore } from '../store/playerStore';

type ArtistDetailParams = { artistId: number; artistName: string };
type RootStackParamList = { ArtistDetail: ArtistDetailParams };

export default function ArtistDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'ArtistDetail'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ArtistDetail'>>();
  const { artistId, artistName } = route.params;

  const { data: artist } = useQuery({
    queryKey: ['artist', artistId],
    queryFn: () => api.getArtist(artistId),
  });
  const { data: albums } = useQuery({
    queryKey: ['albums', artistId],
    queryFn: () => api.getAlbums({ artist_id: artistId }),
  });
  const playTrack = usePlayerStore((s) => s.playTrack);

  const handlePlayAlbum = async (albumId: number) => {
    const tracks = await api.getTracks({ album_id: albumId });
    if (tracks.length > 0) {
      await playTrack(tracks[0], tracks);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineSmall" style={styles.header}>
        {artist?.name ?? artistName}
      </Text>
      <Text variant="titleSmall" style={styles.section}>
        Albums
      </Text>
      {(albums || []).map((a: { id: number; title: string }) => (
        <List.Item
          key={a.id}
          title={a.title}
          onPress={() => handlePlayAlbum(a.id)}
          right={(props) => <List.Icon {...props} icon="play" />}
          style={styles.item}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { padding: 16, color: '#fff' },
  section: { paddingHorizontal: 16, paddingTop: 8, color: '#888' },
  item: { backgroundColor: '#1a1a1a' },
});
