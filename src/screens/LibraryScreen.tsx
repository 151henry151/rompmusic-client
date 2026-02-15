/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState, useMemo } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SegmentedButtons, Text, IconButton, Menu, Divider, List, Switch } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import ArtworkImage, { ArtworkPlaceholder } from '../components/ArtworkImage';
import { usePlayerStore } from '../store/playerStore';
import type { Track } from '../store/playerStore';
import { groupArtistsByNormalizedName, groupArtistsByPrimaryName } from '../utils/artistMerge';
import { groupAlbums, groupAlbumsWithCollab } from '../utils/albumGrouping';
import { useSettingsStore } from '../store/settingsStore';

type RootStackParamList = {
  ArtistDetail: { artistId?: number; artistIds?: number[]; artistName: string; isAssortedArtists?: boolean };
  AlbumDetail: { albumId?: number; albumIds?: number[]; highlightTrackId?: number };
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
  const groupArtistsByCapitalization = useSettingsStore((s) => s.getEffectiveGroupArtistsByCapitalization());
  const groupCollaborationsByPrimary = useSettingsStore((s) => s.getEffectiveGroupCollaborationsByPrimary());
  const setGroupCollaborationsByPrimary = useSettingsStore((s) => s.setGroupCollaborationsByPrimary);
  const isSettingVisible = useSettingsStore((s) => s.isSettingVisible);
  const displayAlbumsWithoutArtwork = useSettingsStore((s) => s.getEffectiveDisplayAlbumsWithoutArtwork());
  const setDisplayAlbumsWithoutArtwork = useSettingsStore((s) => s.setDisplayAlbumsWithoutArtwork);
  const displayArtistsWithoutArtwork = useSettingsStore((s) => s.getEffectiveDisplayArtistsWithoutArtwork());
  const setDisplayArtistsWithoutArtwork = useSettingsStore((s) => s.setDisplayArtistsWithoutArtwork);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isMobile = width < MOBILE_BREAKPOINT;
  const cardsPerRow = isMobile ? 3 : 5;
  const cardWidth = (width - HORIZONTAL_PADDING * 2 - CARD_GAP * (cardsPerRow - 1)) / cardsPerRow;

  const currentSortBy = tab === 'artists' ? sortBy.artists : tab === 'albums' ? sortBy.albums : sortBy.songs;
  const sortOptions = tab === 'artists' ? ARTIST_SORTS : tab === 'albums' ? ALBUM_SORTS : TRACK_SORTS;

  const { data: artistsRaw } = useQuery({
    queryKey: ['artists', sortBy.artists, order],
    queryFn: () => api.getArtists({ limit: 500, sort_by: sortBy.artists, order }),
  });
  const { groupedArtists, usePlaceholderArtistIds } = useMemo(() => {
    let raw = artistsRaw || [];
    if (!displayArtistsWithoutArtwork) {
      raw = raw.filter((a: { has_artwork?: boolean | null }) => a.has_artwork !== false);
    }
    const usePlaceholderArtistIds = new Set<number>();
    if (!groupCollaborationsByPrimary) {
      const byTitle = new Map<string, { id: number }[]>();
      for (const a of raw as { id: number; primary_album_title?: string | null }[]) {
        const t = (a.primary_album_title || '').trim().toLowerCase();
        if (t) {
          if (!byTitle.has(t)) byTitle.set(t, []);
          byTitle.get(t)!.push({ id: a.id });
        }
      }
      for (const [, items] of byTitle) {
        if (items.length >= 3) {
          for (const { id } of items) usePlaceholderArtistIds.add(id);
        }
      }
    }
    let groups: { displayName: string; primaryId: number; artistIds: number[]; isAssortedArtists?: boolean }[];
    if (groupCollaborationsByPrimary) {
      groups = groupArtistsByPrimaryName(raw);
    } else if (!groupArtistsByCapitalization) {
      groups = (raw as { id: number; name: string }[]).map((a) => ({
        displayName: a.name,
        primaryId: a.id,
        artistIds: [a.id],
      }));
    } else {
      groups = groupArtistsByNormalizedName(raw);
    }
    return { groupedArtists: groups, usePlaceholderArtistIds };
  }, [artistsRaw, displayArtistsWithoutArtwork, groupArtistsByCapitalization, groupCollaborationsByPrimary]);
  const { data: albumsRaw } = useQuery({
    queryKey: ['albums', sortBy.albums, order],
    queryFn: () => api.getAlbums({ limit: 500, sort_by: sortBy.albums, order }),
  });
  const albums = useMemo(() => {
    const list = albumsRaw || [];
    if (!displayAlbumsWithoutArtwork) {
      return list.filter((a: { has_artwork?: boolean | null }) => a.has_artwork !== false);
    }
    return list;
  }, [albumsRaw, displayAlbumsWithoutArtwork]);
  const albumGroups = useMemo(
    () => (groupCollaborationsByPrimary ? groupAlbumsWithCollab(albums) : groupAlbums(albums)),
    [albums, groupCollaborationsByPrimary]
  );
  const { data: tracks } = useQuery({
    queryKey: ['tracks', sortBy.songs, order],
    queryFn: () => api.getTracks({ limit: 1000, sort_by: sortBy.songs, order }),
  });

  const albumsGroupedByDecade = useMemo(() => {
    if (sortBy.albums !== 'year') return null;
    const groupsWithYear = albumGroups.map((g) => ({ ...g, year: g.primaryAlbum.year }));
    return groupByDecade(groupsWithYear);
  }, [albumGroups, sortBy.albums]);

  const tracksGroupedByDecade = useMemo(() => {
    if (sortBy.songs !== 'year') return null;
    return groupByDecade(tracks || []);
  }, [tracks, sortBy.songs]);

  const handleAlbumPress = (group: { albumIds: number[] }) => {
    if (group.albumIds.length === 1) {
      navigation.navigate('AlbumDetail', { albumId: group.albumIds[0] });
    } else {
      navigation.navigate('AlbumDetail', { albumIds: group.albumIds });
    }
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

  const renderArtistCard = (g: { displayName: string; primaryId: number; artistIds: number[]; isAssortedArtists?: boolean }) => (
    <TouchableOpacity
      key={g.primaryId}
      style={[styles.card, { width: cardWidth }]}
      onPress={() =>
        navigation.navigate('ArtistDetail', { artistIds: g.artistIds, artistName: g.displayName, isAssortedArtists: g.isAssortedArtists })
      }
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`View ${g.displayName}`}
    >
      {(usePlaceholderArtistIds.has(g.primaryId) || (g as { usePlaceholderArtwork?: boolean }).usePlaceholderArtwork) ? (
        <ArtworkPlaceholder size={cardWidth} style={[styles.cardArtwork, { borderRadius: CARD_RADIUS }]} />
      ) : (
        <ArtworkImage type="artist" id={g.primaryId} size={cardWidth} borderRadius={CARD_RADIUS} style={styles.cardArtwork} />
      )}
      <Text variant="bodyMedium" numberOfLines={2} style={styles.cardTitle}>
        {g.displayName}
      </Text>
    </TouchableOpacity>
  );

  const renderAlbumCard = (
    g: { displayTitle: string; albumIds: number[]; primaryAlbum: { id: number }; artistNames: string; usePlaceholderArtwork?: boolean }
  ) => (
    <TouchableOpacity
      key={g.albumIds.join('-')}
      style={[styles.card, { width: cardWidth }]}
      onPress={() => handleAlbumPress(g)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`View album ${g.displayTitle}`}
    >
      {g.usePlaceholderArtwork ? (
        <ArtworkPlaceholder size={cardWidth} style={[styles.cardArtwork, { borderRadius: CARD_RADIUS }]} />
      ) : (
        <ArtworkImage type="album" id={g.primaryAlbum.id} size={cardWidth} borderRadius={CARD_RADIUS} style={styles.cardArtwork} />
      )}
      <Text variant="bodyMedium" numberOfLines={2} style={styles.cardTitle}>
        {g.displayTitle}
      </Text>
      <Text variant="bodySmall" numberOfLines={1} style={styles.cardSubtitle}>
        {g.artistNames}
      </Text>
    </TouchableOpacity>
  );

  const renderTrackListRow = (
    t: { id: number; title: string; artist_name?: string; album_id: number; album_title?: string },
    list: typeof tracks
  ) => (
    <List.Item
      key={t.id}
      title={t.title}
      description={`${t.artist_name || 'Unknown'} • ${t.album_title || 'Unknown'}`}
      left={() => (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handleTrackPlay(t as any, list);
          }}
          style={styles.trackListArtworkWrap}
          activeOpacity={0.8}
        >
          <ArtworkImage type="album" id={t.album_id} size={48} borderRadius={6} style={styles.trackListArtwork} />
          <View style={styles.trackListPlayOverlay} pointerEvents="none">
            <IconButton icon="play" size={24} iconColor="#fff" />
          </View>
        </TouchableOpacity>
      )}
      onPress={() => (navigation as any).navigate('TrackDetail', { trackId: t.id })}
      style={styles.trackListItem}
      accessibilityRole="button"
      accessibilityLabel={`Play ${t.title}`}
    />
  );

  const renderAlbumSection = (title: string, items: any[], renderCard: (item: any, index: number, list?: any) => JSX.Element) => (
    <View style={styles.decadeSection} key={title}>
      <Text variant="titleSmall" style={styles.decadeHeader}>
        {title}
      </Text>
      <View style={styles.grid}>
        {items.map((item, i) => renderCard(item, i, items))}
      </View>
    </View>
  );

  const renderSongsSection = (title: string, items: any[]) => (
    <View style={styles.decadeSection} key={title}>
      <Text variant="titleSmall" style={styles.decadeHeader}>
        {title}
      </Text>
      {items.map((t) => renderTrackListRow(t, items))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 8 }]}>
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
          {tab === 'artists' && (
            <>
              {isSettingVisible('display_artists_without_artwork') && (
                <View style={styles.inlineToggle}>
                  <Text variant="labelSmall" style={styles.inlineToggleLabel}>
                    No art
                  </Text>
                  <Switch
                    value={displayArtistsWithoutArtwork}
                    onValueChange={setDisplayArtistsWithoutArtwork}
                    color="#4a9eff"
                    style={styles.inlineSwitch}
                  />
                </View>
              )}
              {isSettingVisible('group_collaborations_by_primary') && (
                <View style={styles.inlineToggle}>
                  <Text variant="labelSmall" style={styles.inlineToggleLabel}>
                    Group collab
                  </Text>
                  <Switch
                    value={groupCollaborationsByPrimary}
                    onValueChange={setGroupCollaborationsByPrimary}
                    color="#4a9eff"
                    style={styles.inlineSwitch}
                  />
                </View>
              )}
            </>
          )}
          {tab === 'albums' && (
            <>
              {isSettingVisible('display_albums_without_artwork') && (
                <View style={styles.inlineToggle}>
                  <Text variant="labelSmall" style={styles.inlineToggleLabel}>
                    No art
                  </Text>
                  <Switch
                    value={displayAlbumsWithoutArtwork}
                    onValueChange={setDisplayAlbumsWithoutArtwork}
                    color="#4a9eff"
                    style={styles.inlineSwitch}
                  />
                </View>
              )}
              {isSettingVisible('group_collaborations_by_primary') && (
                <View style={styles.inlineToggle}>
                  <Text variant="labelSmall" style={styles.inlineToggleLabel}>
                    Group collab
                  </Text>
                  <Switch
                    value={groupCollaborationsByPrimary}
                    onValueChange={setGroupCollaborationsByPrimary}
                    color="#4a9eff"
                    style={styles.inlineSwitch}
                  />
                </View>
              )}
            </>
          )}
          {renderSortMenu()}
        </View>
      </View>

      <ScrollView style={styles.scrollContent}>
      {tab === 'artists' && (
        <View style={styles.grid}>
          {groupedArtists.map((g) => renderArtistCard(g))}
        </View>
      )}

      {tab === 'albums' &&
        (albumsGroupedByDecade
          ? albumsGroupedByDecade.map((g) => renderAlbumSection(g.decade, g.items, renderAlbumCard))
          : (
            <View style={styles.grid}>
              {albumGroups.map((g) => renderAlbumCard(g))}
            </View>
          ))}

      {tab === 'songs' &&
        (tracksGroupedByDecade
          ? tracksGroupedByDecade.map((g) => renderSongsSection(g.decade, g.items))
          : (
            <View style={styles.songsList}>
              {(tracks || []).map((t) => renderTrackListRow(t, tracks || []))}
            </View>
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
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    flex: 1,
  },
  segmented: {
    flex: 1,
    margin: 16,
    marginRight: 4,
  },
  sortWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 8,
    gap: 8,
  },
  inlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineToggleLabel: {
    color: '#888',
    marginRight: 4,
  },
  inlineSwitch: {
    transform: [{ scale: 0.9 }],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: HORIZONTAL_PADDING,
    paddingTop: 8,
    gap: CARD_GAP,
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
  songsList: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  trackListItem: {
    backgroundColor: '#1a1a1a',
  },
  trackListArtworkWrap: {
    position: 'relative',
    marginRight: 12,
  },
  trackListArtwork: {
    overflow: 'hidden',
  },
  trackListPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 6,
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
