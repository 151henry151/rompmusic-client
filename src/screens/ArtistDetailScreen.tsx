/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, List } from 'react-native-paper';
import { useQueries } from '@tanstack/react-query';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { usePlayerStore } from '../store/playerStore';
import ArtworkImage from '../components/ArtworkImage';

type ArtistDetailParams =
  | { artistId: number; artistName: string }
  | { artistIds: number[]; artistName: string; isAssortedArtists?: boolean };
type RootStackParamList = {
  ArtistDetail: ArtistDetailParams;
  AlbumDetail: { albumId: number; highlightTrackId?: number };
};

export default function ArtistDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'ArtistDetail'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ArtistDetail'>>();
  const params = route.params;
  const artistIds = 'artistIds' in params ? params.artistIds : [params.artistId];
  const artistName = params.artistName;
  const primaryId = artistIds[0];
  const isAssortedArtists = 'isAssortedArtists' in params && params.isAssortedArtists;

  const albumQueries = useQueries({
    queries: artistIds.map((id) => ({
      queryKey: ['albums', id],
      queryFn: () => api.getAlbums({ artist_id: id }),
    })),
  });
  const albums = useMemo(() => {
    const seen = new Set<number>();
    const seenTitles = new Set<string>();
    const out: { id: number; title: string; year?: number; has_artwork?: boolean | null }[] = [];
    for (const q of albumQueries) {
      if (!q.data) continue;
      for (const a of q.data) {
        const key = isAssortedArtists ? (a.title || '').toLowerCase() : a.id;
        if (isAssortedArtists) {
          if (seenTitles.has(key)) continue;
          seenTitles.add(key);
        } else {
          if (seen.has(a.id)) continue;
          seen.add(a.id);
        }
        out.push(a);
      }
    }
    return out;
  }, [albumQueries, isAssortedArtists]);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const handleAlbumPress = (albumId: number) => {
    navigation.navigate('AlbumDetail', { albumId });
  };

  const handlePlayAlbum = async (albumId: number) => {
    const tracks = await api.getTracks({ album_id: albumId });
    if (tracks.length > 0) {
      await playTrack(tracks[0], tracks);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineSmall" style={styles.header}>
        {artistName}
      </Text>
      <Text variant="titleSmall" style={styles.section}>
        Albums
      </Text>
      {(albums || []).map((a: { id: number; title: string; year?: number }) => (
        <List.Item
          key={a.id}
          title={a.title}
          description={a.year ? String(a.year) : undefined}
          left={() => <ArtworkImage type="album" id={a.id} size={56} style={styles.albumArtwork} />}
          onPress={() => handleAlbumPress(a.id)}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          style={styles.item}
          accessibilityRole="button"
          accessibilityLabel={`View album ${a.title}`}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8, color: '#fff' },
  section: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, color: '#888' },
  item: { backgroundColor: '#1a1a1a' },
  albumArtwork: { marginRight: 12, alignSelf: 'center' },
});
