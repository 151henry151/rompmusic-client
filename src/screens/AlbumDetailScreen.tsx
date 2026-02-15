/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, List, IconButton, Button, Menu } from 'react-native-paper';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { usePlayerStore } from '../store/playerStore';
import ArtworkImage from '../components/ArtworkImage';
import type { Track } from '../store/playerStore';
import { getAlbumDisplayTitle } from '../utils/albumGrouping';

type AlbumDetailParams = { albumId?: number; albumIds?: number[]; highlightTrackId?: number };
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
  const { albumId, albumIds, highlightTrackId } = route.params;
  const effectiveAlbumIds = albumIds ?? (albumId != null ? [albumId] : []);
  const isGrouped = effectiveAlbumIds.length > 1;

  const playTrack = usePlayerStore((s) => s.playTrack);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const playNext = usePlayerStore((s) => s.playNext);

  const albumQueries = useQueries({
    queries: effectiveAlbumIds.map((id) => ({
      queryKey: ['album', id],
      queryFn: () => api.getAlbum(id),
    })),
  });
  const trackQueries = useQueries({
    queries: effectiveAlbumIds.map((id) => ({
      queryKey: ['tracks', id],
      queryFn: () => api.getTracks({ album_id: id }),
    })),
  });

  const albums = useMemo(() => albumQueries.map((q) => q.data).filter(Boolean) as Awaited<ReturnType<typeof api.getAlbum>>[], [albumQueries]);
  const allTracksByAlbum = useMemo(
    () => trackQueries.map((q) => (q.data || []) as (Track & { album_title?: string; artist_name?: string })[]),
    [trackQueries]
  );
  const mergedTracks = useMemo(() => {
    const out: (Track & { album_title?: string; artist_name?: string })[] = [];
    allTracksByAlbum.forEach((arr) => out.push(...arr));
    return out.sort((a, b) => (a.disc_number - b.disc_number) || (a.track_number - b.track_number));
  }, [allTracksByAlbum]);

  const primaryAlbum = albums[0];
  const displayTitle = primaryAlbum ? (isGrouped ? getAlbumDisplayTitle(primaryAlbum.title) : primaryAlbum.title) : '';
  const artistNames = primaryAlbum
    ? (isGrouped ? [...new Set(albums.map((a) => a.artist_name || 'Unknown'))].join(', ') : (primaryAlbum.artist_name || 'Unknown'))
    : '';
  const primaryAlbumId = primaryAlbum?.id ?? effectiveAlbumIds[0];
  const isLoading = albumQueries.some((q) => q.isLoading) || (effectiveAlbumIds.length > 0 && albums.length === 0);
  const tracksLoading = trackQueries.some((q) => q.isLoading);

  const handlePlayTrack = async (track: Track, queue?: Track[]) => {
    await playTrack(track, queue || mergedTracks);
  };

  const handleTrackPress = (track: Track) => {
    navigation.navigate('TrackDetail', { trackId: track.id });
  };

  if (effectiveAlbumIds.length === 0) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.muted}>No album selected.</Text>
      </ScrollView>
    );
  }

  if (isLoading || !primaryAlbum) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.muted}>Loading...</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ArtworkImage type="album" id={primaryAlbumId} size={200} style={styles.artwork} />
      <Text variant="headlineSmall" style={styles.title}>
        {displayTitle}
      </Text>
      <Text variant="bodyLarge" style={styles.artist}>
        {artistNames}
      </Text>
      {primaryAlbum.year && (
        <Text variant="bodySmall" style={styles.year}>
          {primaryAlbum.year}
        </Text>
      )}
      {mergedTracks.length > 0 && (
        <View style={styles.albumActions}>
          <Button
            mode="contained"
            icon="play"
            onPress={() => handlePlayTrack(mergedTracks[0], mergedTracks)}
            style={styles.playAlbumButton}
          >
            Play album
          </Button>
          <View style={styles.albumActionRow}>
            <Button mode="outlined" compact onPress={() => addToQueue(mergedTracks)} style={styles.albumActionBtn}>
              Add to queue
            </Button>
            <Button mode="outlined" compact onPress={() => playNext(mergedTracks)} style={styles.albumActionBtn}>
              Play next
            </Button>
          </View>
        </View>
      )}
      {isGrouped && allTracksByAlbum.length > 1 ? (
        allTracksByAlbum.map((discTracks, idx) => {
          if (discTracks.length === 0) return null;
          const discNum = idx + 1;
          return (
            <View key={effectiveAlbumIds[idx]} style={styles.discSection}>
              <View style={styles.discHeader}>
                <Text variant="titleSmall" style={styles.section}>
                  Disc {discNum}
                </Text>
                <Button
                  mode="outlined"
                  compact
                  icon="play"
                  onPress={() => handlePlayTrack(discTracks[0], discTracks)}
                  style={styles.discPlayBtn}
                >
                  Play
                </Button>
              </View>
              {tracksLoading ? (
                <Text style={styles.muted}>Loading...</Text>
              ) : (
                discTracks.map((t) => {
                  const isHighlighted = highlightTrackId === t.id;
                  return (
                    <TrackRow
                      key={t.id}
                      track={t}
                      albumId={t.album_id}
                      isHighlighted={isHighlighted}
                      onPlay={() => handlePlayTrack(t, discTracks)}
                      onPress={() => handleTrackPress(t)}
                      addToQueue={addToQueue}
                      playNext={playNext}
                    />
                  );
                })
              )}
            </View>
          );
        })
      ) : (
        <>
          <Text variant="titleSmall" style={styles.section}>
            Tracks
          </Text>
          {tracksLoading ? (
            <Text style={styles.muted}>Loading tracks...</Text>
          ) : (
            mergedTracks.map((t) => {
              const isHighlighted = highlightTrackId === t.id;
              return (
                <TrackRow
                  key={t.id}
                  track={t}
                  albumId={t.album_id}
                  isHighlighted={isHighlighted}
                  onPlay={() => handlePlayTrack(t, mergedTracks)}
                  onPress={() => handleTrackPress(t)}
                  addToQueue={addToQueue}
                  playNext={playNext}
                />
              );
            })
          )}
        </>
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
  discSection: {
    marginBottom: 16,
  },
  discHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  discPlayBtn: {
    alignSelf: 'center',
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
