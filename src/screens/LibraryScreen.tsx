/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState, useMemo } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SegmentedButtons, Text, IconButton, Menu, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import ArtworkImage from '../components/ArtworkImage';
import { usePlayerStore } from '../store/playerStore';
import type { Track } from '../store/playerStore';
import { groupArtistsByNormalizedName } from '../utils/artistMerge';

type RootStackParamList = {
  ArtistDetail: { artistId?: number; artistIds?: number[]; artistName: string };
  AlbumDetail: { albumId: number; highlightTrackId?: number };
  TrackDetail: { trackId: number };
};

const CARD_GAP = 10;
const HORIZONTAL_PADDING = 16;
const CARD_RADIUS = 10;
const MOBILE_BREAKPOINT = 600;

// Sort options per tab
const ARTIST_SORTS = [
  { value: 'name', label: 'Artist name' },
  { value: 'date_added', label: 'Date added' },
];

const ALBUM_SORTS = [
  { value: 'year', label: 'Date released' },
  { value: 'date_added', label: 'Date added' },
  { value: 'artist', label: 'Artist name' },
  { value: 'title', label: 'Album title' },
];

const TRACK_SORTS = [
  { value: 'year', label: 'Date released' },
  { value: 'date_added', label: 'Date added' },
  { value: 'artist', label: 'Artist name' },
  { value: 'album', label: 'Album title' },
  { value: 'title', label: 'Track title' },
];

function getDecade(year: number | null | undefined): string {
  if (year == null) return 'Unknown';
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

function groupByDecade<T extends { year?: number | null }>(items: T[]): { decade: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  const order: string[] = [];
  for (const item of items) {
    const d = getDecade(item.year);
    if (!groups.has(d)) {
      groups.set(d, []);
      order.push(d);
    }
    groups.get(d)!.push(item);
  }
  // Sort decades: Unknown last, else descending (2020s, 2010s, ...)
  const known = order.filter((d) => d !== 'Unknown').sort((a, b) => parseInt(b) - parseInt(a));
  const result: { decade: string; items: T[] }[] = [];
  for (const d of known) result.push({ decade: d, items: groups.get(d)! });
  if (groups.has('Unknown')) result.push({ decade: 'Unknown', items: groups.get('Unknown')! });
  return result;
}

type TabType = 'artists' | 'albums' | 'songs';

export default function LibraryScreen() {
  const [tab, setTab] = useState<TabType>('artists');
  const [sortBy, setSortBy] = useState({ artists: 'name', albums: 'year', songs: 'title' });
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'ArtistDetail'>>();
  const playTrack = usePlayerStore((s) => s.playTrack);
  const { width } = useWindowDimensions();

  const isMobile = width < MOBILE_BREAKPOINT;
  const cardsPerRow = isMobile ? 3 : 5;
  const cardWidth = (width - HORIZONTAL_PADDING * 2 - CARD_GAP * (cardsPerRow - 1)) / cardsPerRow;

  const currentSortBy = tab === 'artists' ? sortBy.artists : tab === 'albums' ? sortBy.albums : sortBy.songs;
  const sortOptions = tab === 'artists' ? ARTIST_SORTS : tab === 'albums' ? ALBUM_SORTS : TRACK_SORTS;

  const { data: artistsRaw } = useQuery({
    queryKey: ['artists', sortBy.artists, order],
    queryFn: () => api.getArtists({ limit: 500, sort_by: sortBy.artists, order }),
  });
  const groupedArtists = useMemo(
    () => groupArtistsByNormalizedName(artistsRaw || []),
    [artistsRaw]
  );
  const { data: albums } = useQuery({
    queryKey: ['albums', sortBy.albums, order],
    queryFn: () => api.getAlbums({ limit: 500, sort_by: sortBy.albums, order }),
  });
  const { data: tracks } = useQuery({
    queryKey: ['tracks', sortBy.songs, order],
    queryFn: () => api.getTracks({ limit: 1000, sort_by: sortBy.songs, order }),
  });

  const albumsGroupedByDecade = useMemo(() => {
    if (sortBy.albums !== 'year') return null;
    return groupByDecade(albums || []);
  }, [albums, sortBy.albums]);

  const tracksGroupedByDecade = useMemo(() => {
    if (sortBy.songs !== 'year') return null;
    return groupByDecade(tracks || []);
  }, [tracks, sortBy.songs]);

  const handleAlbumPress = (albumId: number) => {
    navigation.navigate('AlbumDetail', { albumId });
  };

  const handleTrackPlay = (track: Track & { album_title?: string; artist_name?: string }, queue: typeof tracks) => {
    const q = (queue || []).map((t) => ({
      id: t.id,
      title: t.title,
      artist_id: t.artist_id,
      album_id: t.album_id,
      artist_name: t.artist_name,
      album_title: t.album_title,
    }));
    playTrack(track, q);
  };

  const renderSortMenu = () => (
    <Menu
      visible={sortMenuVisible}
      onDismiss={() => setSortMenuVisible(false)}
      anchor={
        <IconButton
          icon="sort"
          onPress={() => setSortMenuVisible(true)}
          iconColor="#888"
          accessibilityLabel="Sort options"
        />
      }
      anchorPosition="top"
    >
      {sortOptions.map((opt) => (
        <Menu.Item
          key={opt.value}
          onPress={() => {
            if (tab === 'artists') setSortBy((s) => ({ ...s, artists: opt.value }));
            else if (tab === 'albums') setSortBy((s) => ({ ...s, albums: opt.value }));
            else setSortBy((s) => ({ ...s, songs: opt.value }));
            setSortMenuVisible(false);
          }}
          title={opt.label}
          titleStyle={{ color: currentSortBy === opt.value ? '#4a9eff' : '#fff' }}
        />
      ))}
      <Divider />
      <Menu.Item
        onPress={() => {
          setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
          setSortMenuVisible(false);
        }}
        title={order === 'asc' ? '↑ Ascending' : '↓ Descending'}
        titleStyle={{ color: '#888' }}
      />
    </Menu>
  );

  const renderArtistCard = (g: { displayName: string; primaryId: number; artistIds: number[] }, index: number) => (
    <TouchableOpacity
      key={g.primaryId}
      style={[styles.card, { width: cardWidth, marginLeft: index % cardsPerRow === 0 ? 0 : CARD_GAP }]}
      onPress={() =>
        navigation.navigate('ArtistDetail', { artistIds: g.artistIds, artistName: g.displayName })
      }
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`View ${g.displayName}`}
    >
      <ArtworkImage type="artist" id={g.primaryId} size={cardWidth} borderRadius={CARD_RADIUS} style={styles.cardArtwork} />
      <Text variant="bodyMedium" numberOfLines={2} style={styles.cardTitle}>
        {g.displayName}
      </Text>
    </TouchableOpacity>
  );

  const renderAlbumCard = (
    a: { id: number; title: string; artist_name?: string; year?: number | null },
    index: number
  ) => (
    <TouchableOpacity
      key={a.id}
      style={[styles.card, { width: cardWidth, marginLeft: index % cardsPerRow === 0 ? 0 : CARD_GAP }]}
      onPress={() => handleAlbumPress(a.id)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`View album ${a.title}`}
    >
      <ArtworkImage type="album" id={a.id} size={cardWidth} borderRadius={CARD_RADIUS} style={styles.cardArtwork} />
      <Text variant="bodyMedium" numberOfLines={2} style={styles.cardTitle}>
        {a.title}
      </Text>
      <Text variant="bodySmall" numberOfLines={1} style={styles.cardSubtitle}>
        {a.artist_name || 'Unknown'}
      </Text>
    </TouchableOpacity>
  );

  const renderTrackCard = (
    t: { id: number; title: string; artist_name?: string; album_id: number; album_title?: string },
    index: number,
    list: typeof tracks
  ) => (
    <TouchableOpacity
      key={t.id}
      style={[styles.card, { width: cardWidth, marginLeft: index % cardsPerRow === 0 ? 0 : CARD_GAP }]}
      onPress={() => (navigation as any).navigate('TrackDetail', { trackId: t.id })}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Play ${t.title}`}
    >
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          handleTrackPlay(t as any, list);
        }}
        style={styles.trackArtworkWrap}
        activeOpacity={0.8}
      >
        <ArtworkImage
          type="album"
          id={t.album_id}
          size={cardWidth}
          borderRadius={CARD_RADIUS}
          style={styles.cardArtwork}
        />
        <View style={styles.playOverlay} pointerEvents="none">
          <IconButton icon="play" size={36} iconColor="#fff" />
        </View>
      </TouchableOpacity>
      <Text variant="bodyMedium" numberOfLines={2} style={styles.cardTitle}>
        {t.title}
      </Text>
      <Text variant="bodySmall" numberOfLines={1} style={styles.cardSubtitle}>
        {t.artist_name || 'Unknown'}
      </Text>
    </TouchableOpacity>
  );

  const renderSection = (title: string, items: any[], renderCard: (item: any, index: number, list?: any) => JSX.Element) => (
    <View style={styles.decadeSection} key={title}>
      <Text variant="titleSmall" style={styles.decadeHeader}>
        {title}
      </Text>
      <View style={styles.grid}>
        {items.map((item, i) => renderCard(item, i, items))}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <SegmentedButtons
          value={tab}
          onValueChange={(v) => setTab(v as TabType)}
          buttons={[
            { value: 'artists', label: 'Artists' },
            { value: 'albums', label: 'Albums' },
            { value: 'songs', label: 'Songs' },
          ]}
          style={styles.segmented}
        />
        <View style={styles.sortWrap}>
          {renderSortMenu()}
        </View>
      </View>

      {tab === 'artists' && (
        <View style={styles.grid}>
          {groupedArtists.map((g, i) => renderArtistCard(g, i))}
        </View>
      )}

      {tab === 'albums' &&
        (albumsGroupedByDecade
          ? albumsGroupedByDecade.map((g) => renderSection(g.decade, g.items, renderAlbumCard))
          : (
            <View style={styles.grid}>
              {(albums || []).map((a, i) => renderAlbumCard(a, i))}
            </View>
          ))}

      {tab === 'songs' &&
        (tracksGroupedByDecade
          ? tracksGroupedByDecade.map((g) =>
              renderSection(g.decade, g.items, (item, i, list) => renderTrackCard(item, i, list || g.items))
            )
          : (
            <View style={styles.grid}>
              {(tracks || []).map((t, i) => renderTrackCard(t, i, tracks || []))}
            </View>
          ))}
    </ScrollView>
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
    justifyContent: 'space-between',
  },
  segmented: {
    flex: 1,
    margin: 16,
    marginRight: 4,
  },
  sortWrap: {
    justifyContent: 'center',
    paddingRight: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: HORIZONTAL_PADDING,
    paddingTop: 8,
  },
  card: {
    marginBottom: CARD_GAP,
  },
  cardArtwork: {
    overflow: 'hidden',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#fff',
    fontWeight: '600',
  },
  cardSubtitle: {
    color: '#888',
    marginTop: 2,
  },
  trackArtworkWrap: {
    position: 'relative',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: CARD_RADIUS,
  },
  decadeSection: {
    marginBottom: 24,
  },
  decadeHeader: {
    color: '#888',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 8,
  },
});
