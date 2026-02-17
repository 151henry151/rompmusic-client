/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState, useMemo, useEffect } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, IconButton, Menu, Divider, List, TextInput, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import ArtworkImage, { ArtworkPlaceholder } from '../components/ArtworkImage';
import { usePlayerStore } from '../store/playerStore';
import type { Track } from '../store/playerStore';
import { groupArtistsByNormalizedName, groupArtistsByPrimaryName } from '../utils/artistMerge';
import { groupAlbums, groupAlbumsWithCollab } from '../utils/albumGrouping';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import type { AppStackParamList } from '../navigation/types';

const CARD_GAP = 10;
const HORIZONTAL_PADDING = 16;
const CARD_RADIUS = 10;
const MOBILE_BREAKPOINT = 600;
/** Page size for paginated library lists (artists, albums, tracks) to avoid loading huge lists and crashing. */
const LIBRARY_PAGE_SIZE = 50;

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
  const [tab, setTab] = useState<TabType>('albums');
  const [sortBy, setSortBy] = useState({ artists: 'name', albums: 'title', songs: 'title' });
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [tabMenuVisible, setTabMenuVisible] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSuggestQuery, setDebouncedSuggestQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSuggestQuery(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: suggestionData } = useQuery({
    queryKey: ['search-suggestions', debouncedSuggestQuery],
    queryFn: () => api.search(debouncedSuggestQuery, 5),
    enabled: debouncedSuggestQuery.length >= 2,
    staleTime: 60 * 1000,
  });

  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'Library'>>();
  const playTrack = usePlayerStore((s) => s.playTrack);
  const groupArtistsByCapitalization = useSettingsStore((s) => s.getEffectiveGroupArtistsByCapitalization());
  const groupCollaborationsByPrimary = useSettingsStore((s) => s.getEffectiveGroupCollaborationsByPrimary());
  const albumsArtworkFirst = useSettingsStore((s) => s.getEffectiveAlbumsArtworkFirst());
  const user = useAuthStore((s) => s.user);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isMobile = width < MOBILE_BREAKPOINT;
  const cardsPerRow = isMobile ? 3 : 5;
  const cardWidth = Math.max(100, (width - HORIZONTAL_PADDING * 2 - CARD_GAP * (cardsPerRow - 1)) / cardsPerRow);

  const currentSortBy = tab === 'artists' ? sortBy.artists : tab === 'albums' ? sortBy.albums : sortBy.songs;
  const sortOptions = tab === 'artists' ? ARTIST_SORTS : tab === 'albums' ? ALBUM_SORTS : TRACK_SORTS;
  const tabLabel = tab === 'albums' ? 'Albums' : tab === 'artists' ? 'Artists' : 'Songs';

  const {
    data: artistsData,
    isLoading: artistsLoading,
    error: artistsError,
    fetchNextPage: fetchMoreArtists,
    hasNextPage: hasMoreArtists,
    isFetchingNextPage: artistsLoadingMore,
  } = useInfiniteQuery({
    queryKey: ['artists', sortBy.artists, order, searchQuery],
    queryFn: ({ pageParam }) =>
      api.getArtists({
        skip: pageParam,
        limit: LIBRARY_PAGE_SIZE,
        sort_by: sortBy.artists,
        order,
        search: searchQuery || undefined,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      (lastPage as unknown[]).length === LIBRARY_PAGE_SIZE ? allPages.length * LIBRARY_PAGE_SIZE : undefined,
  });
  const artistsRaw = useMemo(() => artistsData?.pages.flat() ?? [], [artistsData?.pages]);
  const { groupedArtists } = useMemo(() => {
    const raw = artistsRaw;
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
    return { groupedArtists: groups };
  }, [artistsRaw, groupArtistsByCapitalization, groupCollaborationsByPrimary]);
  const {
    data: albumsData,
    isLoading: albumsLoading,
    error: albumsError,
    fetchNextPage: fetchMoreAlbums,
    hasNextPage: hasMoreAlbums,
    isFetchingNextPage: albumsLoadingMore,
  } = useInfiniteQuery({
    queryKey: ['albums', sortBy.albums, order, searchQuery, albumsArtworkFirst],
    queryFn: ({ pageParam }) =>
      api.getAlbums({
        skip: pageParam,
        limit: LIBRARY_PAGE_SIZE,
        sort_by: sortBy.albums,
        order,
        search: searchQuery || undefined,
        artwork_first: albumsArtworkFirst,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      (lastPage as unknown[]).length === LIBRARY_PAGE_SIZE ? allPages.length * LIBRARY_PAGE_SIZE : undefined,
  });
  const albumsRaw = albumsData?.pages.flat() ?? [];
  const albums = albumsRaw;
  const albumGroups = useMemo(() => {
    return groupCollaborationsByPrimary ? groupAlbumsWithCollab(albums) : groupAlbums(albums);
  }, [albums, groupCollaborationsByPrimary]);
  const {
    data: tracksData,
    isLoading: tracksLoading,
    error: tracksError,
    fetchNextPage: fetchMoreTracks,
    hasNextPage: hasMoreTracks,
    isFetchingNextPage: tracksLoadingMore,
  } = useInfiniteQuery({
    queryKey: ['tracks', sortBy.songs, order, searchQuery],
    queryFn: ({ pageParam }) =>
      api.getTracks({
        skip: pageParam,
        limit: LIBRARY_PAGE_SIZE,
        sort_by: sortBy.songs,
        order,
        search: searchQuery || undefined,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      (lastPage as unknown[]).length === LIBRARY_PAGE_SIZE ? allPages.length * LIBRARY_PAGE_SIZE : undefined,
  });
  const tracks = tracksData?.pages.flat() ?? [];

  const anyLoading = artistsLoading || albumsLoading || tracksLoading;
  const anyError = artistsError || albumsError || tracksError;
  const allSettledEmpty =
    !anyLoading &&
    !anyError &&
    (groupedArtists?.length ?? 0) === 0 &&
    albumGroups.length === 0 &&
    (tracks || []).length === 0;

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

  const handleTrackPlay = (track: Track & { album_title?: string; artist_name?: string }, queue: (Track & { album_title?: string; artist_name?: string })[] | undefined) => {
    playTrack(track, queue || []);
  };

  const hasSuggestions = suggestionData && debouncedSuggestQuery.length >= 2;
  const showSuggestions = hasSuggestions && (suggestionData.artists?.length > 0 || suggestionData.albums?.length > 0 || suggestionData.tracks?.length > 0);
  const clearSearchAndNavigate = (fn: () => void) => {
    setSearchInput('');
    setSearchQuery('');
    fn();
  };

  const renderTabMenu = () => (
    <Menu
      visible={tabMenuVisible}
      onDismiss={() => setTabMenuVisible(false)}
      anchor={
        <Button
          mode="outlined"
          compact
          onPress={() => setTabMenuVisible(true)}
          icon="chevron-down"
          style={styles.tabButton}
          contentStyle={styles.tabButtonContent}
          labelStyle={styles.tabButtonLabel}
        >
          {tabLabel}
        </Button>
      }
      anchorPosition="bottom"
    >
      <Menu.Item onPress={() => { setTab('albums'); setTabMenuVisible(false); }} title="Albums" leadingIcon="album" />
      <Menu.Item onPress={() => { setTab('artists'); setTabMenuVisible(false); }} title="Artists" leadingIcon="account" />
      <Menu.Item onPress={() => { setTab('songs'); setTabMenuVisible(false); }} title="Songs" leadingIcon="music" />
    </Menu>
  );

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

  const renderArtistRow = (g: { displayName: string; primaryId: number; artistIds: number[]; isAssortedArtists?: boolean }) => (
    <List.Item
      key={g.primaryId}
      title={g.displayName}
      onPress={() =>
        navigation.navigate('ArtistDetail', { artistIds: g.artistIds, artistName: g.displayName, isAssortedArtists: g.isAssortedArtists })
      }
      right={(props) => <List.Icon {...props} icon="chevron-right" />}
      style={styles.artistListItem}
      accessibilityRole="button"
      accessibilityLabel={`View ${g.displayName}`}
    />
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
    t: { id: number; title: string; artist_name?: string; artist_id?: number; album_id: number; album_title?: string },
    list: typeof tracks
  ) => (
    <List.Item
      key={t.id}
      title={t.title}
      description={
        <View style={styles.trackDescRow}>
          <Text
            variant="bodySmall"
            style={styles.trackDescLink}
            onPress={(e) => { e?.stopPropagation?.(); navigation.navigate('ArtistDetail', { artistIds: [t.artist_id ?? 0], artistName: t.artist_name || 'Unknown' }); }}
          >
            {t.artist_name || 'Unknown'}
          </Text>
          <Text variant="bodySmall" style={styles.trackDescSep}> • </Text>
          <Text
            variant="bodySmall"
            style={styles.trackDescLink}
            onPress={(e) => { e?.stopPropagation?.(); navigation.navigate('AlbumDetail', { albumId: t.album_id }); }}
          >
            {t.album_title || 'Unknown'}
          </Text>
        </View>
      }
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

  const renderAlbumSection = (title: string, items: unknown[], renderCard: (item: any, index: number, list?: any) => React.ReactElement) => (
    <View style={styles.decadeSection} key={title}>
      <Text variant="titleSmall" style={styles.decadeHeader}>
        {title}
      </Text>
      <View style={styles.grid}>
        {items.map((item, i) => renderCard(item, i, items))}
      </View>
    </View>
  );

  const renderSongsSection = (title: string, items: (Track & { album_title?: string; artist_name?: string })[]) => (
    <View style={styles.decadeSection} key={title}>
      <Text variant="titleSmall" style={styles.decadeHeader}>
        {title}
      </Text>
      {items.map((t: Track & { album_title?: string; artist_name?: string }) => renderTrackListRow(t, items))}
    </View>
  );

  const headerHeight = 56 + insets.top;
  return (
    <View style={styles.container}>
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 8 }]}>
        <View style={styles.tabDropdownWrap}>
          {renderTabMenu()}
        </View>
        <View style={styles.sortWrap}>
          <TextInput
            mode="outlined"
            placeholder="Search…"
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={() => setSearchQuery(searchInput.trim())}
            returnKeyType="search"
            dense
            style={styles.searchInput}
            left={<TextInput.Icon icon="magnify" />}
            right={
              searchInput ? (
                <TextInput.Icon icon="close" onPress={() => { setSearchInput(''); setSearchQuery(''); }} />
              ) : undefined
            }
            accessibilityLabel="Search library"
          />
          {renderSortMenu()}
          {!user && (
            <Button
              mode="outlined"
              compact
              onPress={() => (navigation as any).navigate('Login')}
              style={styles.signInButton}
              labelStyle={styles.signInButtonLabel}
            >
              Sign in
            </Button>
          )}
          {user && (
            <IconButton
              icon="clock-outline"
              onPress={() => navigation.navigate('History')}
              iconColor="#888"
              accessibilityLabel="Play history"
            />
          )}
          <IconButton
            icon="cog"
            onPress={() => navigation.navigate('Settings')}
            iconColor="#888"
            accessibilityLabel="Settings"
          />
        </View>
      </View>

      <View style={[styles.scrollWrapper, { top: headerHeight }]}>
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
      {anyLoading && artistsRaw.length === 0 && albumsRaw.length === 0 && tracks.length === 0 && (
        <View style={styles.loadingWrap}>
          <Text variant="bodyLarge" style={styles.loadingText}>Loading library…</Text>
        </View>
      )}
      {anyError && artistsRaw.length === 0 && albumsRaw.length === 0 && tracks.length === 0 && (
        <View style={styles.loadingWrap}>
          <Text variant="bodyLarge" style={styles.errorText}>
            Failed to load: {(() => {
              const err = artistsError || albumsError || tracksError;
              return err instanceof Error ? err.message : String(err);
            })()}
          </Text>
        </View>
      )}
      {allSettledEmpty && !showSuggestions && (
        <View style={styles.loadingWrap}>
          <Text variant="bodyLarge" style={styles.loadingText}>
            No library items. Log in to the server dashboard and run a library scan to import your music.
          </Text>
        </View>
      )}
      {showSuggestions && (
        <View style={styles.suggestionsSection}>
          <Text variant="labelLarge" style={styles.suggestionsTitle}>Suggestions</Text>
          {(suggestionData.artists || []).slice(0, 5).map((a: { id: number; name: string }) => (
            <List.Item
              key={`sug-artist-${a.id}`}
              title={a.name}
              left={() => <List.Icon icon="account" />}
              onPress={() => clearSearchAndNavigate(() => navigation.navigate('ArtistDetail', { artistIds: [a.id], artistName: a.name }))}
              style={styles.suggestionItem}
            />
          ))}
          {(suggestionData.albums || []).slice(0, 5).map((a: { id: number; title: string; artist_name?: string }) => (
            <List.Item
              key={`sug-album-${a.id}`}
              title={a.title}
              description={a.artist_name}
              left={() => <ArtworkImage type="album" id={a.id} size={40} style={styles.suggestionArtwork} />}
              onPress={() => clearSearchAndNavigate(() => navigation.navigate('AlbumDetail', { albumId: a.id }))}
              style={styles.suggestionItem}
            />
          ))}
          {(suggestionData.tracks || []).slice(0, 5).map((t: { id: number; title: string; artist_name?: string; album_id: number }) => (
            <List.Item
              key={`sug-track-${t.id}`}
              title={t.title}
              description={t.artist_name}
              left={() => <ArtworkImage type="album" id={t.album_id} size={40} style={styles.suggestionArtwork} />}
              onPress={() => clearSearchAndNavigate(() => (navigation as any).navigate('TrackDetail', { trackId: t.id }))}
              style={styles.suggestionItem}
            />
          ))}
        </View>
      )}
      {tab === 'artists' && (
        <View style={styles.artistsList}>
          {groupedArtists.map((g) => renderArtistRow(g))}
          {hasMoreArtists && (
            <Button mode="outlined" onPress={() => fetchMoreArtists()} loading={artistsLoadingMore} disabled={artistsLoadingMore} style={styles.loadMoreBtn}>
              {artistsLoadingMore ? 'Loading…' : 'Load more artists'}
            </Button>
          )}
        </View>
      )}

      {tab === 'albums' && (
        <>
          {albumsGroupedByDecade
            ? albumsGroupedByDecade.map((g) => renderAlbumSection(g.decade, g.items, renderAlbumCard))
            : (
              <View style={styles.grid}>
                {albumGroups.map((g) => renderAlbumCard(g))}
              </View>
            )}
          {hasMoreAlbums && (
            <Button mode="outlined" onPress={() => fetchMoreAlbums()} loading={albumsLoadingMore} disabled={albumsLoadingMore} style={styles.loadMoreBtn}>
              {albumsLoadingMore ? 'Loading…' : 'Load more albums'}
            </Button>
          )}
        </>
      )}

      {tab === 'songs' && (
        <>
          {tracksGroupedByDecade
            ? tracksGroupedByDecade.map((g) => renderSongsSection(g.decade, g.items as (Track & { album_title?: string; artist_name?: string })[]))
            : (
              <View style={styles.songsList}>
                {tracks.map((t: Track & { album_title?: string; artist_name?: string }) => renderTrackListRow(t, tracks))}
              </View>
            )}
          {hasMoreTracks && (
            <Button mode="outlined" onPress={() => fetchMoreTracks()} loading={tracksLoadingMore} disabled={tracksLoadingMore} style={styles.loadMoreBtn}>
              {tracksLoadingMore ? 'Loading…' : 'Load more songs'}
            </Button>
          )}
        </>
      )}
        </ScrollView>
      </View>
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
    flexShrink: 0,
  },
  scrollWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollContent: {
    flex: 1,
  },
  tabDropdownWrap: {
    paddingLeft: 16,
    paddingRight: 8,
    flexShrink: 0,
  },
  tabButton: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
    borderWidth: 1,
  },
  tabButtonContent: {
    flexDirection: 'row-reverse',
  },
  tabButtonLabel: {
    color: '#fff',
  },
  sortWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#1a1a1a',
  },
  signInButton: {
    borderColor: '#444',
  },
  signInButtonLabel: {
    color: '#fff',
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
  artistsList: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  loadMoreBtn: {
    marginHorizontal: HORIZONTAL_PADDING,
    marginVertical: 16,
  },
  suggestionsSection: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: '#141414',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  suggestionsTitle: {
    color: '#888',
    marginBottom: 8,
  },
  suggestionItem: {
    backgroundColor: 'transparent',
  },
  suggestionArtwork: {
    marginRight: 8,
  },
  artistListItem: {
    backgroundColor: '#1a1a1a',
  },
  songsList: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  trackListItem: {
    backgroundColor: '#1a1a1a',
  },
  trackDescRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  trackDescLink: {
    color: '#4a9eff',
  },
  trackDescSep: {
    color: '#666',
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
  loadingWrap: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
  },
  errorText: {
    color: '#e57373',
  },
});
