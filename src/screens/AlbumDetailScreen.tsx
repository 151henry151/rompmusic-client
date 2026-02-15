/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, List, IconButton, Button, Menu } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { usePlayerStore } from '../store/playerStore';
import ArtworkImage from '../components/ArtworkImage';
import type { Track } from '../store/playerStore';

type AlbumDetailParams = { albumId: number; highlightTrackId?: number };
type RootStackParamList = {
  AlbumDetail: AlbumDetailParams;
  TrackDetail: { trackId: number };
  ArtistDetail: { artistId?: number; artistIds?: number[]; artistName: string };
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TrackRow({
  track,
  albumId,
  isHighlighted,
  onPlay,
  onPress,
  addToQueue,
  playNext,
}: {
  track: Track & { album_title?: string; artist_name?: string };
  albumId: number;
  isHighlighted: boolean;
  onPlay: () => void;
  onPress: () => void;
  addToQueue: (t: Track | Track[]) => void;
  playNext: (t: Track | Track[]) => void;
}) {
  const [menuVisible, setMenuVisible] = useState(false);
  return (
    <List.Item
      title={track.title}
      description={formatDuration(track.duration)}
      left={() => <ArtworkImage type="album" id={albumId} size={40} style={styles.trackArtwork} />}
      right={() => (
        <View style={styles.trackActions}>
          <IconButton icon="play" onPress={onPlay} accessibilityLabel={`Play ${track.title}`} />
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={<IconButton icon="dots-vertical" onPress={() => setMenuVisible(true)} accessibilityLabel="Track options" />}
          >
            <Menu.Item onPress={() => { addToQueue(track); setMenuVisible(false); }} title="Add to queue" leadingIcon="playlist-plus" />
            <Menu.Item onPress={() => { playNext(track); setMenuVisible(false); }} title="Play next" leadingIcon="play-circle" />
          </Menu>
        </View>
      )}
      onPress={onPress}
      style={[styles.trackItem, isHighlighted && styles.highlightedTrack]}
      accessibilityRole="button"
      accessibilityLabel={`${track.title}. ${isHighlighted ? 'Currently viewing' : ''}. Double tap to view`}
    />
  );
}

export default function AlbumDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'AlbumDetail'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AlbumDetail'>>();
  const { albumId, highlightTrackId } = route.params;
  const playTrack = usePlayerStore((s) => s.playTrack);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const playNext = usePlayerStore((s) => s.playNext);

  const { data: album, isLoading: albumLoading } = useQuery({
    queryKey: ['album', albumId],
    queryFn: () => api.getAlbum(albumId),
  });
  const { data: tracks, isLoading: tracksLoading } = useQuery({
    queryKey: ['tracks', albumId],
    queryFn: () => api.getTracks({ album_id: albumId }),
  });

  const handlePlayTrack = async (track: Track) => {
    await playTrack(track, tracks || []);
  };

  const handleTrackPress = (track: Track) => {
    navigation.navigate('TrackDetail', { trackId: track.id });
  };

  if (albumLoading || !album) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.muted}>Loading...</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ArtworkImage type="album" id={albumId} size={200} style={styles.artwork} />
      <Text variant="headlineSmall" style={styles.title}>
        {album.title}
      </Text>
      <Text variant="bodyLarge" style={styles.artist}>
        {album.artist_name || 'Unknown'}
      </Text>
      {album.year && (
        <Text variant="bodySmall" style={styles.year}>
          {album.year}
        </Text>
      )}
      {tracks && tracks.length > 0 && (
        <View style={styles.albumActions}>
          <Button
            mode="contained"
            icon="play"
            onPress={() => handlePlayTrack(tracks[0], tracks)}
            style={styles.playAlbumButton}
          >
            Play album
          </Button>
          <View style={styles.albumActionRow}>
            <Button mode="outlined" compact onPress={() => addToQueue(tracks)} style={styles.albumActionBtn}>
              Add to queue
            </Button>
            <Button mode="outlined" compact onPress={() => playNext(tracks)} style={styles.albumActionBtn}>
              Play next
            </Button>
          </View>
        </View>
      )}
      <Text variant="titleSmall" style={styles.section}>
        Tracks
      </Text>
      {tracksLoading ? (
        <Text style={styles.muted}>Loading tracks...</Text>
      ) : (
        (tracks || []).map((t: Track & { album_title?: string; artist_name?: string }) => {
          const isHighlighted = highlightTrackId === t.id;
          return (
            <TrackRow
              key={t.id}
              track={t}
              albumId={albumId}
              isHighlighted={isHighlighted}
              onPlay={() => handlePlayTrack(t, tracks || [])}
              onPress={() => handleTrackPress(t)}
              addToQueue={addToQueue}
              playNext={playNext}
            />
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  artwork: {
    alignSelf: 'center',
    marginVertical: 24,
  },
  title: {
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  artist: {
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  year: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  albumActions: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  playAlbumButton: {
    marginBottom: 8,
  },
  albumActionRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  albumActionBtn: {
    flex: 1,
  },
  trackActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 8,
    color: '#888',
  },
  trackItem: {
    backgroundColor: '#1a1a1a',
  },
  highlightedTrack: {
    backgroundColor: '#2a3a4a',
    borderLeftWidth: 4,
    borderLeftColor: '#4a9eff',
  },
  trackArtwork: {
    marginRight: 8,
    alignSelf: 'center',
  },
  muted: {
    padding: 24,
    color: '#666',
  },
});
