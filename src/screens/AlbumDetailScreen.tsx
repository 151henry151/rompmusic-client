/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useMemo, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Platform, Share } from 'react-native';
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
  onShare,
}: {
  track: Track & { album_title?: string; artist_name?: string };
  albumId: number;
  isHighlighted: boolean;
  onPlay: () => void;
  onPress: () => void;
  addToQueue: (t: Track | Track[]) => void;
  playNext: (t: Track | Track[]) => void;
  onShare?: (t: Track & { album_title?: string; artist_name?: string }) => void;
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
            {onShare && (
              <Menu.Item onPress={() => { onShare(track); setMenuVisible(false); }} title="Share" leadingIcon="share-variant" />
            )}
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
  // Normalize to unique numbers (URL may give string; avoid duplicate ids from any source)
  const effectiveAlbumIds = useMemo(() => {
    const raw = albumIds ?? (albumId != null ? [albumId] : []);
    return [...new Set(raw.map((id) => Number(id)).filter(Boolean))];
  }, [albumId, albumIds]);
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
  /** Dedupe by track id, then by (album_id, disc, track) so we never show logical duplicates (duplicate DB rows or merged editions). */
  const dedupeTracks = (tracks: (Track & { album_title?: string; artist_name?: string })[]) => {
    const seenId = new Set<number>();
    const seenSlot = new Set<string>();
    return tracks.filter((t) => {
      const key = `${t.album_id}|${t.disc_number}|${t.track_number}`;
      if (seenId.has(t.id) || seenSlot.has(key)) return false;
      seenId.add(t.id);
      seenSlot.add(key);
      return true;
    });
  };
  const allTracksByAlbum = useMemo(
    () =>
      trackQueries.map((q) => {
        const list = (q.data || []) as (Track & { album_title?: string; artist_name?: string })[];
        return dedupeTracks(list).sort((a, b) => (a.disc_number - b.disc_number) || (a.track_number - b.track_number));
      }),
    [trackQueries]
  );
  const mergedTracks = useMemo(() => {
    const out: (Track & { album_title?: string; artist_name?: string })[] = [];
    allTracksByAlbum.forEach((arr) => out.push(...arr));
    return dedupeTracks(out).sort((a, b) => (a.disc_number - b.disc_number) || (a.track_number - b.track_number));
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

  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const clearShareFeedback = useCallback(() => {
    setShareFeedback(null);
  }, []);

  const getAlbumUrl = () => {
    const id = primaryAlbumId ?? effectiveAlbumIds[0];
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return `${window.location.origin}/album/${id}`;
    }
    return `${typeof window !== 'undefined' ? window.location?.origin : 'https://rompmusic.com'}/album/${id}`;
  };

  const copyToClipboardAndNotify = useCallback((url: string, message: string) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => {
          setShareFeedback(message);
          setTimeout(clearShareFeedback, 2500);
        },
        () => setShareFeedback(url)
      );
    } else {
      setShareFeedback(url);
      setTimeout(clearShareFeedback, 2500);
    }
  }, [clearShareFeedback]);

  const handleShare = async () => {
    const url = getAlbumUrl();
    const title = displayTitle || 'Album';
    const message = `${displayTitle}${artistNames ? ` – ${artistNames}` : ''}`;
    try {
      if (Platform.OS !== 'web' && Share.share) {
        await Share.share({
          message: `${message}\n${url}`,
          url: Platform.OS === 'ios' ? url : undefined,
          title,
        });
      } else if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text: message, url });
      } else {
        copyToClipboardAndNotify(url, 'Album link copied!');
      }
    } catch {
      copyToClipboardAndNotify(url, 'Album link copied!');
    }
  };

  const getTrackUrl = useCallback((trackId: number) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return `${window.location.origin}/track/${trackId}`;
    }
    return `${typeof window !== 'undefined' ? window.location?.origin : 'https://rompmusic.com'}/track/${trackId}`;
  }, []);

  const handleShareTrack = useCallback((track: Track & { album_title?: string; artist_name?: string }) => {
    const url = getTrackUrl(track.id);
    const title = track.title;
    const message = `${track.title}${track.artist_name ? ` – ${track.artist_name}` : ''}`;
    if (Platform.OS !== 'web' && Share.share) {
      Share.share({
        message: `${message}\n${url}`,
        url: Platform.OS === 'ios' ? url : undefined,
        title,
      }).catch(() => copyToClipboardAndNotify(url, 'Track link copied!'));
    } else if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title, text: message, url }).catch(() => copyToClipboardAndNotify(url, 'Track link copied!'));
    } else {
      copyToClipboardAndNotify(url, 'Track link copied!');
    }
  }, [getTrackUrl, copyToClipboardAndNotify]);

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
      {shareFeedback ? (
        <View style={styles.shareFeedbackWrap}>
          <Text style={styles.shareFeedback}>{shareFeedback}</Text>
        </View>
      ) : null}
      <ArtworkImage type="album" id={primaryAlbumId} size={200} style={styles.artwork} />
      <Text variant="headlineSmall" style={styles.title}>
        {displayTitle}
      </Text>
      <Text
        variant="bodyLarge"
        style={styles.artist}
        onPress={() => primaryAlbum && navigation.navigate('ArtistDetail', { artistIds: [primaryAlbum.artist_id], artistName: primaryAlbum.artist_name || 'Unknown' })}
      >
        {artistNames}
      </Text>
      {primaryAlbum.year && (
        <Text variant="bodySmall" style={styles.year}>
          {primaryAlbum.year}
        </Text>
      )}
      {!isGrouped && (
        <View style={styles.albumActions}>
          {mergedTracks.length > 0 && (
            <>
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
            </>
          )}
          <View style={styles.albumActionRow}>
            <Button mode="outlined" compact onPress={handleShare} style={styles.albumActionBtn} icon="share-variant">
              Share
            </Button>
          </View>
        </View>
      )}
      {isGrouped && effectiveAlbumIds.length > 1 ? (
        <>
          <View style={styles.albumActions}>
            <Button mode="outlined" compact onPress={handleShare} style={styles.albumActionBtn} icon="share-variant">
              Share
            </Button>
          </View>
          <Text variant="titleSmall" style={styles.section}>
            Editions
          </Text>
          {allTracksByAlbum.map((discTracks, idx) => {
            const versionAlbum = albums[idx];
            const versionTitle = versionAlbum?.title ?? `Version ${idx + 1}`;
            return (
              <View key={effectiveAlbumIds[idx]} style={styles.discSection}>
                <View style={styles.discHeader}>
                  <Text variant="titleSmall" style={styles.section} numberOfLines={2}>
                    {versionTitle}
                  </Text>
                  {discTracks.length > 0 && (
                    <View style={styles.discActions}>
                      <Button
                        mode="contained"
                        compact
                        icon="play"
                        onPress={() => handlePlayTrack(discTracks[0], discTracks)}
                        style={styles.discPlayBtn}
                      >
                        Play album
                      </Button>
                      <View style={styles.discActionRow}>
                        <Button mode="outlined" compact onPress={() => addToQueue(discTracks)} style={styles.albumActionBtn}>
                          Add to queue
                        </Button>
                        <Button mode="outlined" compact onPress={() => playNext(discTracks)} style={styles.albumActionBtn}>
                          Play next
                        </Button>
                      </View>
                    </View>
                  )}
                </View>
                {tracksLoading && discTracks.length === 0 ? (
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
                        onShare={handleShareTrack}
                      />
                    );
                  })
                )}
              </View>
            );
          })}
        </>
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
                  onShare={handleShareTrack}
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
    color: '#4a9eff',
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
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  discActions: {
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  discActionRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
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
  shareFeedbackWrap: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  shareFeedback: {
    color: '#4ade80',
    fontSize: 14,
  },
});
