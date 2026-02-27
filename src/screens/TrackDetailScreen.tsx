/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { usePlayerStore } from '../store/playerStore';
import ArtworkImage from '../components/ArtworkImage';

type TrackDetailParams = { trackId: number };
type RootStackParamList = { TrackDetail: TrackDetailParams; AlbumDetail: { albumId: number; highlightTrackId?: number } };

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TrackDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'TrackDetail'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'TrackDetail'>>();
  const { trackId } = route.params;
  const playTrack = usePlayerStore((s) => s.playTrack);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const playNext = usePlayerStore((s) => s.playNext);

  const { data: track, isLoading } = useQuery({
    queryKey: ['track', trackId],
    queryFn: () => api.getTrack(trackId),
  });

  if (isLoading || !track) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.muted}>Loading...</Text>
      </ScrollView>
    );
  }

  const handlePlay = async () => {
    const tracks = await api.getTracks({ album_id: track.album_id });
    await playTrack(track, tracks);
  };

  const handleViewAlbum = () => {
    navigation.navigate('AlbumDetail', { albumId: track.album_id, highlightTrackId: track.id });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ArtworkImage type="album" id={track.album_id} size={200} style={styles.artwork} />
      <Text variant="headlineSmall" style={styles.title}>
        {track.title}
      </Text>
      <Text variant="bodyLarge" style={styles.artist}>
        {track.artist_name || 'Unknown'}
      </Text>
      <Text variant="bodyMedium" style={styles.album}>
        {track.album_title || 'Unknown Album'}
      </Text>
      <Text variant="bodySmall" style={styles.duration}>
        {formatDuration(track.duration)}
      </Text>
      <Button mode="contained" onPress={handlePlay} style={styles.playButton} icon="play">
        Play
      </Button>
      <Button mode="outlined" onPress={() => addToQueue(track)} style={styles.albumButton} icon="playlist-plus">
        Add to queue
      </Button>
      <Button mode="outlined" onPress={() => playNext(track)} style={styles.albumButton} icon="play-circle">
        Play next
      </Button>
      <Button mode="outlined" onPress={handleViewAlbum} style={styles.albumButton} icon="album">
        View album
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  artwork: {
    marginBottom: 24,
  },
  title: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  artist: {
    color: '#888',
    textAlign: 'center',
    marginBottom: 4,
  },
  album: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  duration: {
    color: '#666',
    marginBottom: 24,
  },
  playButton: {
    marginBottom: 12,
  },
  albumButton: {
    marginBottom: 24,
  },
  muted: {
    padding: 24,
    color: '#666',
  },
});
