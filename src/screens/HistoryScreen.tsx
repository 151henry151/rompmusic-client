/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Play history – recently played tracks.
 */

import React from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, List, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { usePlayerStore } from '../store/playerStore';
import ArtworkImage from '../components/ArtworkImage';
import type { Track } from '../store/playerStore';
import type { AppStackParamList } from '../navigation/types';

export default function HistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'History'>>();
  const playTrack = usePlayerStore((s) => s.playTrack);

  const { data: tracks, isLoading } = useQuery({
    queryKey: ['recently-played'],
    queryFn: () => api.getRecentlyPlayed(100),
  });

  const list = (tracks || []) as (Track & { album_title?: string; artist_name?: string })[];

  const handleTrackPress = (track: Track & { album_title?: string; artist_name?: string }) => {
    playTrack(track, list);
  };

  const handleAlbumPress = (albumId: number) => {
    navigation.navigate('AlbumDetail', { albumId });
  };

  const handleArtistPress = (artistId: number, artistName: string) => {
    navigation.navigate('ArtistDetail', { artistIds: [artistId], artistName });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          iconColor="#fff"
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back"
        />
        <Text variant="headlineSmall" style={styles.headerTitle}>
          Play history
        </Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {isLoading && (
          <Text style={styles.muted}>Loading…</Text>
        )}
        {!isLoading && list.length === 0 && (
          <Text style={styles.muted}>No play history. Play some tracks to see them here.</Text>
        )}
        {list.length > 0 && list.map((t) => (
          <List.Item
            key={t.id}
            title={t.title}
            description={
              <View style={styles.descRow}>
                <Text
                  variant="bodySmall"
                  style={styles.link}
                  onPress={() => handleArtistPress(t.artist_id, t.artist_name || 'Unknown')}
                >
                  {t.artist_name || 'Unknown'}
                </Text>
                <Text variant="bodySmall" style={styles.descSep}> • </Text>
                <Text
                  variant="bodySmall"
                  style={styles.link}
                  onPress={() => handleAlbumPress(t.album_id)}
                >
                  {t.album_title || 'Unknown'}
                </Text>
              </View>
            }
            left={() => (
              <TouchableOpacity onPress={() => handleTrackPress(t)} style={styles.artworkWrap} activeOpacity={0.8}>
                <ArtworkImage type="album" id={t.album_id} size={48} borderRadius={6} style={styles.artwork} />
                <View style={styles.playOverlay} pointerEvents="none">
                  <IconButton icon="play" size={24} iconColor="#fff" />
                </View>
              </TouchableOpacity>
            )}
            onPress={() => handleTrackPress(t)}
            style={styles.item}
            accessibilityRole="button"
            accessibilityLabel={`Play ${t.title}`}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    color: '#fff',
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  muted: {
    color: '#666',
    padding: 24,
  },
  item: {
    backgroundColor: 'transparent',
  },
  artworkWrap: {
    marginRight: 12,
  },
  artwork: {},
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 6,
  },
  descRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  link: {
    color: '#4a9eff',
  },
  descSep: {
    color: '#666',
  },
});
