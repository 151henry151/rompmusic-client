/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState, useMemo } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native';
import { TextInput, List, Text, IconButton } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { usePlayerStore } from '../store/playerStore';
import ArtworkImage from '../components/ArtworkImage';
import { groupArtistsByNormalizedName } from '../utils/artistMerge';

type RootStackParamList = {
  ArtistDetail: { artistId?: number; artistIds?: number[]; artistName: string; isAssortedArtists?: boolean };
  AlbumDetail: { albumId: number; highlightTrackId?: number };
  TrackDetail: { trackId: number };
};

export default function SearchScreen() {
  const [q, setQ] = useState('');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'ArtistDetail'>>();
  const playTrack = usePlayerStore((s) => s.playTrack);

  const { data, isLoading } = useQuery({
    queryKey: ['search', q],
    queryFn: () => api.search(q),
    enabled: q.length >= 2,
  });
  const groupedSearchArtists = useMemo(
    () => groupArtistsByNormalizedName(data?.artists || []),
    [data?.artists]
  );

  const handlePlayTrack = async (trackId: number) => {
    const track = (data?.tracks || []).find((t: { id: number }) => t.id === trackId);
    if (track) await playTrack(track, data?.tracks || []);
  };

  const handleTrackPress = (trackId: number) => {
    navigation.navigate('TrackDetail', { trackId });
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

      {/* Artists */}
      {groupedSearchArtists.length > 0 && (
        <>
          <Text variant="titleSmall" style={styles.section}>
            Artists
          </Text>
          {groupedSearchArtists.map((g) => (
            <List.Item
              key={`artist-${g.primaryId}`}
              title={g.displayName}
              left={() => <List.Icon icon="account" />}
              onPress={() =>
                navigation.navigate('ArtistDetail', {
                  artistIds: g.artistIds,
                  artistName: g.displayName,
                })
              }
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              style={styles.item}
              accessibilityRole="button"
              accessibilityLabel={`View artist ${g.displayName}`}
            />
          ))}
        </>
      )}

      {/* Albums */}
      {data?.albums?.length > 0 && (
        <>
          <Text variant="titleSmall" style={styles.section}>
            Albums
          </Text>
          {(data.albums || []).map((a: { id: number; title: string; artist_name?: string }) => (
            <List.Item
              key={`album-${a.id}`}
              title={a.title}
              description={a.artist_name}
              left={() => <ArtworkImage type="album" id={a.id} size={48} style={styles.artwork} />}
              onPress={() => navigation.navigate('AlbumDetail', { albumId: a.id })}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              style={styles.item}
              accessibilityRole="button"
              accessibilityLabel={`View album ${a.title}`}
            />
          ))}
        </>
      )}

      {/* Tracks */}
      {data?.tracks?.length > 0 && (
        <>
          <Text variant="titleSmall" style={styles.section}>
            Tracks
          </Text>
          {(data.tracks || []).map((t: { id: number; title: string; artist_name?: string; album_id: number }) => (
            <View key={`track-${t.id}`} style={styles.trackRow}>
              <TouchableOpacity
                style={styles.trackRowMain}
                onPress={() => handleTrackPress(t.id)}
                accessibilityRole="button"
                accessibilityLabel={`View details for ${t.title} by ${t.artist_name || 'Unknown'}`}
              >
                <ArtworkImage type="album" id={t.album_id} size={48} style={styles.artwork} />
                <View style={styles.trackRowText}>
                  <Text variant="bodyLarge" style={styles.trackTitle}>{t.title}</Text>
                  <Text variant="bodySmall" style={styles.trackDesc}>{t.artist_name || 'Unknown'}</Text>
                </View>
              </TouchableOpacity>
              <IconButton
                icon="play"
                onPress={() => handlePlayTrack(t.id)}
                accessibilityLabel={`Play ${t.title}`}
              />
            </View>
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
  section: { padding: 16, color: '#fff', paddingBottom: 8 },
  item: { backgroundColor: '#1a1a1a' },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 8,
  },
  trackRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },
  trackRowText: { flex: 1, marginLeft: 12 },
  trackTitle: { color: '#fff' },
  trackDesc: { color: '#888' },
  artwork: { marginRight: 0 },
});
