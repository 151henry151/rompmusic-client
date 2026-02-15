/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, List, IconButton } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { usePlayerStore } from '../store/playerStore';
import ArtworkImage from '../components/ArtworkImage';
import type { Track } from '../store/playerStore';
import { groupArtistsByNormalizedName } from '../utils/artistMerge';

type RootStackParamList = {
  ArtistDetail: { artistId?: number; artistIds?: number[]; artistName: string };
  TrackDetail: { trackId: number };
  AlbumDetail: { albumId: number; highlightTrackId?: number };
};

const CARD_SIZE = 140;
const CARD_RADIUS = 10;
const CARD_GAP = 12;

function TrackCard({
  track,
  tracks,
  onPlay,
  onPress,
}: {
  track: Track & { album_title?: string; artist_name?: string };
  tracks: Track[];
  onPlay: (t: Track, queue: Track[]) => void;
  onPress: (t: Track) => void;
}) {
  return (
    <TouchableOpacity style={styles.trackCard} onPress={() => onPress(track)} activeOpacity={0.7}>
      <TouchableOpacity onPress={(e) => { e.stopPropagation(); onPlay(track, tracks); }} style={styles.cardArtworkWrap} activeOpacity={0.8}>
        <ArtworkImage type="album" id={track.album_id} size={CARD_SIZE} borderRadius={CARD_RADIUS} style={styles.cardArtwork} />
        <View style={styles.cardPlayOverlay} pointerEvents="none">
          <IconButton icon="play" size={40} iconColor="#fff" />
        </View>
      </TouchableOpacity>
      <Text variant="bodyMedium" numberOfLines={2} style={styles.cardTitle}>{track.title}</Text>
      <Text variant="bodySmall" numberOfLines={1} style={styles.cardArtist}>{track.artist_name || 'Unknown'}</Text>
    </TouchableOpacity>
  );
}

function TrackCardSection({
  title,
  tracks,
  onPlay,
  onPress,
}: {
  title: string;
  tracks: (Track & { album_title?: string; artist_name?: string })[];
  onPlay: (t: Track, queue: Track[]) => void;
  onPress: (t: Track) => void;
}) {
  return (
    <View style={styles.cardSection}>
      <Text variant="titleMedium" style={styles.sectionHeader}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRow}>
        {tracks.map((t) => (
          <TrackCard key={t.id} track={t} tracks={tracks} onPlay={onPlay} onPress={onPress} />
        ))}
      </ScrollView>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'ArtistDetail'>>();
  const playTrack = usePlayerStore((s) => s.playTrack);

  const { data: artistsRaw, isLoading: artistsLoading } = useQuery({
    queryKey: ['artists', 'home'],
    queryFn: () => api.getArtists({ limit: 100, home: true }),
  });
  const groupedArtists = useMemo(
    () => groupArtistsByNormalizedName(artistsRaw || []),
    [artistsRaw]
  );
  const { data: recentlyAdded, isLoading: recentLoading } = useQuery({
    queryKey: ['recently-added'],
    queryFn: () => api.getRecentlyAdded(10),
  });
  const { data: recentlyPlayed, isLoading: playedLoading } = useQuery({
    queryKey: ['recently-played'],
    queryFn: () => api.getRecentlyPlayed(10).catch(() => []),
  });
  const { data: frequentlyPlayed, isLoading: freqLoading } = useQuery({
    queryKey: ['frequently-played'],
    queryFn: () => api.getFrequentlyPlayed(10).catch(() => []),
  });
  const { data: mostPlayed, isLoading: mostLoading } = useQuery({
    queryKey: ['most-played'],
    queryFn: () => api.getMostPlayed(10).catch(() => []),
  });
  const { data: recommended, isLoading: recLoading } = useQuery({
    queryKey: ['recommended'],
    queryFn: () => api.getRecommendedTracks(10).catch(() => []),
  });

  const handlePlayTrack = async (track: Track, queue?: Track[]) => {
    await playTrack(track, queue || []);
  };

  const handleTrackPress = (track: Track) => {
    (navigation as any).navigate('TrackDetail', { trackId: track.id });
  };

  const trackSections = [
    { title: 'Recently played', data: recentlyPlayed, loading: playedLoading },
    { title: 'Recently added', data: recentlyAdded, loading: recentLoading },
    { title: 'Frequently played', data: frequentlyPlayed, loading: freqLoading },
    { title: 'Most played', data: mostPlayed, loading: mostLoading },
    { title: 'Recommended for you', data: recommended, loading: recLoading },
  ];

  return (
    <ScrollView style={styles.container}>
      {trackSections.map(({ title, data, loading }) =>
        data && data.length > 0 ? (
          <TrackCardSection
            key={title}
            title={title}
            tracks={data}
            onPlay={handlePlayTrack}
            onPress={handleTrackPress}
          />
        ) : loading ? (
          <Text key={title} style={styles.muted}>Loading {title.toLowerCase()}...</Text>
        ) : null
      )}

      {/* Artists */}
      <Text variant="titleMedium" style={styles.sectionHeader}>
        Artists
      </Text>
      {artistsLoading ? (
        <Text style={styles.muted}>Loading artists...</Text>
      ) : (
        groupedArtists.map((g) => (
          <List.Item
            key={g.primaryId}
            title={g.displayName}
            left={() => <ArtworkImage type="artist" id={g.primaryId} size={48} style={styles.artistArtwork} />}
            onPress={() =>
              navigation.navigate('ArtistDetail', {
                artistIds: g.artistIds,
                artistName: g.displayName,
              })
            }
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            style={styles.item}
            accessibilityRole="button"
            accessibilityLabel={`View ${g.displayName}`}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    color: '#fff',
  },
  muted: {
    padding: 16,
    color: '#666',
  },
  item: {
    backgroundColor: '#1a1a1a',
  },
  trackItem: {
    backgroundColor: '#1a1a1a',
  },
  cardSection: { marginBottom: 16 },
  cardRow: { paddingHorizontal: 16, gap: CARD_GAP },
  trackCard: { width: CARD_SIZE + 8, position: 'relative' },
  cardArtworkWrap: { position: 'relative' },
  cardArtwork: { overflow: 'hidden' },
  cardPlayOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cardTitle: { color: '#fff', marginTop: 8 },
  cardArtist: { color: '#888', marginTop: 2 },
  artistArtwork: {
    marginRight: 8,
    alignSelf: 'center',
  },
  duration: {
    color: '#888',
    marginRight: 8,
  },
});
