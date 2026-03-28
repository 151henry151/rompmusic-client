/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Offline Library screen - shows downloaded tracks and recently played tracks
 * that are available for offline playback.
 */

import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { Text, List, IconButton, Button, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOfflineStore, type OfflineTrack } from '../store/offlineStore';
import { usePlayerStore } from '../store/playerStore';
import ArtworkImage from '../components/ArtworkImage';
import { TrackDownloadButton } from '../components/DownloadButton';
import type { AppStackParamList } from '../navigation/types';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type FilterType = 'all' | 'downloaded' | 'recent';

export default function OfflineLibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const insets = useSafeAreaInsets();
  const playTrack = usePlayerStore((s) => s.playTrack);
  const [filter, setFilter] = useState<FilterType>('all');

  const downloadedTracks = useOfflineStore((s) => s.downloadedTracks);
  const recentlyPlayedIds = useOfflineStore((s) => s.recentlyPlayedIds);
  const recentlyPlayedTracks = useOfflineStore((s) => s.recentlyPlayedTracks);

  const downloaded = useMemo(() => Object.values(downloadedTracks), [downloadedTracks]);
  const recent = useMemo(
    () => recentlyPlayedIds.map((id) => recentlyPlayedTracks[id]).filter(Boolean) as OfflineTrack[],
    [recentlyPlayedIds, recentlyPlayedTracks]
  );

  const tracks = useMemo(() => {
    if (filter === 'downloaded') return downloaded;
    if (filter === 'recent') return recent;
    const seen = new Set<number>();
    const all: OfflineTrack[] = [];
    for (const t of downloaded) {
      seen.add(t.id);
      all.push(t);
    }
    for (const t of recent) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        all.push(t);
      }
    }
    return all;
  }, [filter, downloaded, recent]);

  // Group by album
  const albumGroups = useMemo(() => {
    const map = new Map<number, { title: string; artistName: string; albumId: number; tracks: OfflineTrack[] }>();
    for (const t of tracks) {
      if (!map.has(t.album_id)) {
        map.set(t.album_id, {
          title: t.album_title ?? 'Unknown Album',
          artistName: t.artist_name ?? 'Unknown',
          albumId: t.album_id,
          tracks: [],
        });
      }
      map.get(t.album_id)!.tracks.push(t);
    }
    return Array.from(map.values());
  }, [tracks]);

  const handlePlay = (track: OfflineTrack) => {
    const queue = tracks.length > 1 ? tracks : [track];
    playTrack(track, queue);
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.emptyText}>Offline library is only available on the mobile app.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} iconColor="#fff" />
        <Text variant="titleLarge" style={styles.headerTitle}>Offline Library</Text>
      </View>

      <View style={styles.filterRow}>
        <Chip
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          textStyle={filter === 'all' ? styles.filterChipTextActive : styles.filterChipText}
        >
          All ({downloaded.length + recent.filter((r) => !downloadedTracks[r.id]).length})
        </Chip>
        <Chip
          selected={filter === 'downloaded'}
          onPress={() => setFilter('downloaded')}
          style={[styles.filterChip, filter === 'downloaded' && styles.filterChipActive]}
          textStyle={filter === 'downloaded' ? styles.filterChipTextActive : styles.filterChipText}
        >
          Downloaded ({downloaded.length})
        </Chip>
        <Chip
          selected={filter === 'recent'}
          onPress={() => setFilter('recent')}
          style={[styles.filterChip, filter === 'recent' && styles.filterChipActive]}
          textStyle={filter === 'recent' ? styles.filterChipTextActive : styles.filterChipText}
        >
          Recent ({recent.length})
        </Chip>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {tracks.length === 0 ? (
          <View style={styles.emptyWrap}>
            <IconButton icon="download-off" size={48} iconColor="#555" />
            <Text style={styles.emptyText}>
              {filter === 'downloaded'
                ? 'No downloaded songs yet.\nTap the download icon on any song or album to save it for offline playback.'
                : filter === 'recent'
                ? 'No recently played songs yet.\nPlay some music and it will appear here.'
                : 'Your offline library is empty.\nDownload songs or play music to build your offline library.'}
            </Text>
          </View>
        ) : (
          albumGroups.map((group) => (
            <View key={group.albumId} style={styles.albumGroup}>
              <TouchableOpacity
                style={styles.albumHeader}
                onPress={() => navigation.navigate('AlbumDetail', { albumId: group.albumId })}
                activeOpacity={0.7}
              >
                <ArtworkImage type="album" id={group.albumId} size={56} borderRadius={8} style={styles.albumArt} />
                <View style={styles.albumInfo}>
                  <Text variant="titleSmall" style={styles.albumTitle} numberOfLines={1}>
                    {group.title}
                  </Text>
                  <Text variant="bodySmall" style={styles.albumArtist} numberOfLines={1}>
                    {group.artistName}
                  </Text>
                  <Text variant="bodySmall" style={styles.albumCount}>
                    {group.tracks.length} {group.tracks.length === 1 ? 'song' : 'songs'}
                  </Text>
                </View>
              </TouchableOpacity>
              {group.tracks.map((t) => (
                <List.Item
                  key={t.id}
                  title={t.title}
                  description={formatDuration(t.duration)}
                  left={() => (
                    <TouchableOpacity onPress={() => handlePlay(t)} activeOpacity={0.8}>
                      <ArtworkImage type="album" id={t.album_id} size={40} borderRadius={6} />
                    </TouchableOpacity>
                  )}
                  right={() => (
                    <View style={styles.trackActions}>
                      <IconButton icon="play" size={20} onPress={() => handlePlay(t)} accessibilityLabel={`Play ${t.title}`} />
                      <TrackDownloadButton track={t} size={18} />
                    </View>
                  )}
                  onPress={() => (navigation as any).navigate('TrackDetail', { trackId: t.id })}
                  style={styles.trackItem}
                />
              ))}
            </View>
          ))
        )}
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
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#1a1a1a',
  },
  filterChipActive: {
    backgroundColor: '#4a9eff',
  },
  filterChipText: {
    color: '#888',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
  },
  albumGroup: {
    marginBottom: 16,
  },
  albumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#111',
  },
  albumArt: {
    marginRight: 12,
  },
  albumInfo: {
    flex: 1,
  },
  albumTitle: {
    color: '#fff',
    fontWeight: '600',
  },
  albumArtist: {
    color: '#4a9eff',
    marginTop: 2,
  },
  albumCount: {
    color: '#666',
    marginTop: 2,
  },
  trackActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackItem: {
    backgroundColor: '#1a1a1a',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
});
