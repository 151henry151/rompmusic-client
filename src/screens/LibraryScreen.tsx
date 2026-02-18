/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent, Platform, ActivityIndicator, Image } from 'react-native';
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
/** Page sizes for library lists (server max per request). Load full list by fetching until no more pages. */
const LIBRARY_ARTISTS_PAGE_SIZE = 500;
const LIBRARY_ALBUMS_PAGE_SIZE = 500;
const LIBRARY_TRACKS_PAGE_SIZE = 1000;

/** Full A–Z + # for the section index when sorted alphabetically (always show all letters). */
const FULL_ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'];

/** Decade labels for section index when sorted by date released (newest first). */
const DECADE_LABELS = ['2020s', '2010s', '2000s', '1990s', '1980s', '1970s', '1960s', '1950s', 'Unknown'];

/** DOM id prefix for library section headers (web: scrollIntoView / getBoundingClientRect). */
const LIBRARY_SECTION_ID_PREFIX = 'library-section-';

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

function firstLetterKey(s: string): string {
  const trimmed = (s || '').trim();
  const first = trimmed.charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : '#';
}

function groupByFirstLetter<T>(items: T[], getLabel: (item: T) => string): { letter: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const letter = firstLetterKey(getLabel(item));
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter)!.push(item);
  }
  const letters = Array.from(groups.keys()).sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)));
  return letters.map((letter) => ({ letter, items: groups.get(letter)! }));
}

type TabType = 'artists' | 'albums';

function SectionIndex({
  sectionKeys,
  currentSection,
  onSectionPress,
  style,
}: {
  sectionKeys: string[];
  currentSection: string | null;
  onSectionPress: (key: string) => void;
  style?: object;
}) {
  if (sectionKeys.length === 0) return null;
  return (
    <View style={[sectionIndexStyles.strip, style]} pointerEvents="box-none">
      <View style={sectionIndexStyles.column}>
        {sectionKeys.map((key) => {
          const active = key === currentSection;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => onSectionPress(key)}
              style={sectionIndexStyles.item}
              accessibilityLabel={`Jump to ${key}`}
              accessibilityRole="button"
            >
              <Text style={[sectionIndexStyles.label, active && sectionIndexStyles.labelActive]} numberOfLines={1}>
                {key}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const sectionIndexStyles = StyleSheet.create({
  strip: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  column: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    minWidth: 22,
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  labelActive: {
    color: '#4a9eff',
  },
});

export default function LibraryScreen() {
  const [tab, setTab] = useState<TabType>('albums');
  const [sortBy, setSortBy] = useState({ artists: 'name', albums: 'title' });
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

  const currentSortBy = tab === 'artists' ? sortBy.artists : sortBy.albums;
  const sortOptions = tab === 'artists' ? ARTIST_SORTS : ALBUM_SORTS;
  const tabLabel = tab === 'albums' ? 'Albums' : 'Artists';

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
        limit: LIBRARY_ARTISTS_PAGE_SIZE,
        sort_by: sortBy.artists,
        order,
        search: searchQuery || undefined,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      (lastPage as unknown[]).length === LIBRARY_ARTISTS_PAGE_SIZE ? allPages.length * LIBRARY_ARTISTS_PAGE_SIZE : undefined,
    enabled: !searchQuery,
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
        limit: LIBRARY_ALBUMS_PAGE_SIZE,
        sort_by: sortBy.albums,
        order,
        search: searchQuery || undefined,
        artwork_first: albumsArtworkFirst,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      (lastPage as unknown[]).length === LIBRARY_ALBUMS_PAGE_SIZE ? allPages.length * LIBRARY_ALBUMS_PAGE_SIZE : undefined,
    enabled: !searchQuery,
  });
  const albumsRaw = albumsData?.pages.flat() ?? [];
  const albums = albumsRaw;
  const albumGroups = useMemo(() => {
    return groupCollaborationsByPrimary ? groupAlbumsWithCollab(albums) : groupAlbums(albums);
  }, [albums, groupCollaborationsByPrimary]);
  const { data: searchResultsData, isLoading: searchResultsLoading } = useQuery({
    queryKey: ['search-results', searchQuery],
    queryFn: () => api.search(searchQuery.trim(), 50),
    enabled: searchQuery.trim().length >= 1,
    staleTime: 60 * 1000,
  });
  const searchResults = searchResultsData ?? { artists: [], albums: [], tracks: [] };

  useEffect(() => {
    if (searchQuery) return;
    if (hasMoreArtists && !artistsLoadingMore && !artistsLoading) fetchMoreArtists();
  }, [searchQuery, hasMoreArtists, artistsLoadingMore, artistsLoading, fetchMoreArtists]);
  useEffect(() => {
    if (searchQuery) return;
    if (hasMoreAlbums && !albumsLoadingMore && !albumsLoading) fetchMoreAlbums();
  }, [searchQuery, hasMoreAlbums, albumsLoadingMore, albumsLoading, fetchMoreAlbums]);

  const anyLoading = searchQuery ? searchResultsLoading : (artistsLoading || albumsLoading);
  const anyError = searchQuery ? false : (artistsError || albumsError);
  const allSettledEmpty =
    !searchQuery &&
    !anyLoading &&
    !anyError &&
    (groupedArtists?.length ?? 0) === 0 &&
    albumGroups.length === 0;

  const albumsGroupedByDecade = useMemo(() => {
    if (sortBy.albums !== 'year') return null;
    const groupsWithYear = albumGroups.map((g) => ({ ...g, year: g.primaryAlbum.year }));
    return groupByDecade(groupsWithYear);
  }, [albumGroups, sortBy.albums]);

  const scrollViewRef = useRef<ScrollView | null>(null);
  const scrollableNodeRef = useRef<HTMLElement | null>(null);
  const sectionOffsetsRef = useRef<Record<string, number>>({});
  const listContentTopRef = useRef(0);
  const scrollContentRef = useRef<View>(null);
  const sectionHeaderRefsRef = useRef<Record<string, View | null>>({});
  const targetSectionToScrollRef = useRef<string | null>(null);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [targetSectionToScroll, setTargetSectionToScroll] = useState<string | null>(null);
  targetSectionToScrollRef.current = targetSectionToScroll;
  const scrollToOffsetRef = useRef<(y: number) => void>(() => {});
  const sectionJumpFetchCountRef = useRef(0);
  const SECTION_JUMP_FETCH_LIMIT = 30;
  const INFINITE_SCROLL_THRESHOLD = 400;

  const scrollToOffset = useCallback((y: number) => {
    const ref = scrollViewRef.current;
    if (Platform.OS === 'web' && scrollableNodeRef.current) {
      scrollableNodeRef.current.scrollTop = y;
      return;
    }
    if (!ref) return;
    if (typeof ref.scrollTo === 'function') {
      ref.scrollTo({ y, animated: true });
      return;
    }
    if (Platform.OS === 'web') {
      const r = ref as unknown as { _scrollRef?: HTMLElement };
      if (r._scrollRef && typeof r._scrollRef.scrollTop !== 'undefined') {
        r._scrollRef.scrollTop = y;
      }
    }
  }, []);
  scrollToOffsetRef.current = scrollToOffset;

  const setScrollViewRef = useCallback((r: ScrollView | null) => {
    scrollViewRef.current = r;
    if (Platform.OS === 'web' && r) {
      const x = r as unknown as { getScrollableNode?: () => HTMLElement | null; _scrollRef?: HTMLElement; _nativeRef?: HTMLElement };
      const node =
        x.getScrollableNode?.() ??
        (x._scrollRef && typeof (x._scrollRef as HTMLElement).scrollTop !== 'undefined' ? (x._scrollRef as HTMLElement) : null) ??
        (x._nativeRef && typeof (x._nativeRef as HTMLElement).scrollTop !== 'undefined' ? (x._nativeRef as HTMLElement) : null) ??
        null;
      scrollableNodeRef.current = node;
    } else {
      scrollableNodeRef.current = null;
    }
  }, []);

  const artistsByLetter = useMemo(() => groupByFirstLetter(groupedArtists, (g) => g.displayName), [groupedArtists]);
  const albumsByLetter = useMemo(() => {
    if (sortBy.albums === 'year' || sortBy.albums === 'date_added') return null;
    return groupByFirstLetter(
      albumGroups,
      sortBy.albums === 'artist' ? (g) => g.artistNames : (g) => g.displayTitle
    );
  }, [albumGroups, sortBy.albums]);
  const sectionKeys = useMemo(() => {
    if (tab === 'artists') return FULL_ALPHABET;
    if (tab === 'albums') {
      if (sortBy.albums === 'date_added') return [];
      if (albumsGroupedByDecade) return DECADE_LABELS;
      return FULL_ALPHABET;
    }
    return [];
  }, [tab, sortBy.albums, albumsGroupedByDecade]);

  useEffect(() => {
    sectionOffsetsRef.current = {};
    localSectionOffsetsRef.current = {};
  }, [sectionKeys, tab]);

  const hasSectionInData =
    tab === 'artists'
      ? artistsByLetter.some((s) => s.letter === targetSectionToScroll)
      : (albumsGroupedByDecade?.some((g) => g.decade === targetSectionToScroll)) ??
        (albumsByLetter?.some((s) => s.letter === targetSectionToScroll)) ??
        false;

  const getSectionScrollY = useCallback((key: string): number | undefined => {
    const fromMeasure = sectionOffsetsRef.current[key];
    if (fromMeasure != null) return fromMeasure;
    const local = localSectionOffsetsRef.current[key];
    if (local != null) return listContentTopRef.current + local;
    return undefined;
  }, []);

  /** Native: scroll to section by measuring the section header ref (same idea as web scrollIntoView). */
  const scrollToSectionByRef = useCallback(
    (key: string) => {
      const headerNode = sectionHeaderRefsRef.current[key];
      const contentNode = scrollContentRef.current;
      if (headerNode && contentNode && typeof (headerNode as any).measureLayout === 'function') {
        (headerNode as any).measureLayout(contentNode, 0, 0, (_x: number, y: number) => {
          scrollToOffset(y);
        });
        return true;
      }
      return false;
    },
    [scrollToOffset]
  );

  useEffect(() => {
    if (!targetSectionToScroll) return;
    if (hasSectionInData) {
      const key = targetSectionToScroll;
      if (Platform.OS === 'web') {
        const id = `${LIBRARY_SECTION_ID_PREFIX}${key}`;
        const tryScroll = () => {
          const el = document.getElementById(id);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTargetSectionToScroll(null);
          }
        };
        requestAnimationFrame(() => setTimeout(tryScroll, 50));
        return;
      }
      const tryScrollNative = () => {
        if (scrollToSectionByRef(key)) setTargetSectionToScroll(null);
      };
      requestAnimationFrame(() => setTimeout(tryScrollNative, 100));
      return;
    }
    if (sectionJumpFetchCountRef.current >= SECTION_JUMP_FETCH_LIMIT) {
      setTargetSectionToScroll(null);
      return;
    }
    const hasMore = tab === 'artists' ? hasMoreArtists : hasMoreAlbums;
    const loading = tab === 'artists' ? artistsLoadingMore : albumsLoadingMore;
    if (hasMore && !loading) {
      sectionJumpFetchCountRef.current += 1;
      if (tab === 'artists') fetchMoreArtists();
      else fetchMoreAlbums();
    } else if (!hasMore) {
      setTargetSectionToScroll(null);
    }
  }, [
    targetSectionToScroll,
    hasSectionInData,
    scrollToSectionByRef,
    tab,
    hasMoreArtists,
    hasMoreAlbums,
    artistsLoadingMore,
    albumsLoadingMore,
    fetchMoreArtists,
    fetchMoreAlbums,
  ]);

  const handleSectionPress = useCallback(
    (key: string) => {
      if (Platform.OS === 'web') {
        const id = `${LIBRARY_SECTION_ID_PREFIX}${key}`;
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        sectionJumpFetchCountRef.current = 0;
        setTargetSectionToScroll(key);
        return;
      }
      // Native: same behavior as web – locate section by ref and scroll to it (measure on tap)
      if (scrollToSectionByRef(key)) return;
      const idx = sectionKeys.indexOf(key);
      for (let i = idx; i < sectionKeys.length; i++) {
        if (scrollToSectionByRef(sectionKeys[i])) return;
      }
      sectionJumpFetchCountRef.current = 0;
      setTargetSectionToScroll(key);
    },
    [sectionKeys, scrollToSectionByRef]
  );

  const contentAreaTop = 56 + insets.top;

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;

      if (Platform.OS === 'web') {
        // Highlight: which section header is at the top of the content area (DOM-based)
        let found: string | null = null;
        const threshold = contentAreaTop + 8;
        for (let i = sectionKeys.length - 1; i >= 0; i--) {
          const k = sectionKeys[i];
          const el = document.getElementById(`${LIBRARY_SECTION_ID_PREFIX}${k}`);
          if (el) {
            const top = el.getBoundingClientRect().top;
            if (top <= threshold) {
              found = k;
              break;
            }
          }
        }
        setCurrentSection(found ?? sectionKeys[0] ?? null);
      } else {
        const scrollY = contentOffset.y;
        const keysByOffset = sectionKeys
          .map((k) => ({ k, y: getSectionScrollY(k) }))
          .filter((x): x is { k: string; y: number } => typeof x.y === 'number')
          .sort((a, b) => a.y - b.y);
        let found: string | null = null;
        for (const { k, y } of keysByOffset) {
          if (y <= scrollY) found = k;
        }
        setCurrentSection(found ?? keysByOffset[0]?.k ?? null);
      }

      const scrollY =
        Platform.OS === 'web' && scrollableNodeRef.current != null
          ? scrollableNodeRef.current.scrollTop
          : contentOffset.y;
      const nearBottom =
        contentSize.height > 0 &&
        scrollY + layoutMeasurement.height >= contentSize.height - INFINITE_SCROLL_THRESHOLD;
      if (nearBottom) {
        if (tab === 'artists' && hasMoreArtists && !artistsLoadingMore) fetchMoreArtists();
        else if (tab === 'albums' && hasMoreAlbums && !albumsLoadingMore) fetchMoreAlbums();
      }
    },
    [
      sectionKeys,
      getSectionScrollY,
      tab,
      hasMoreArtists,
      hasMoreAlbums,
      artistsLoadingMore,
      albumsLoadingMore,
      fetchMoreArtists,
      fetchMoreAlbums,
    ]
  );

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

  const hasSuggestions = !searchQuery && suggestionData && debouncedSuggestQuery.length >= 2;
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
            else setSortBy((s) => ({ ...s, albums: opt.value }));
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
        <ArtworkImage type="album" id={g.primaryAlbum.id} size={cardWidth} borderRadius={CARD_RADIUS} style={styles.cardArtwork} defer />
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
    list: (Track & { album_title?: string; artist_name?: string })[]
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
          <ArtworkImage type="album" id={t.album_id} size={48} borderRadius={6} style={styles.trackListArtwork} defer />
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

  const localSectionOffsetsRef = useRef<Record<string, number>>({});

  const registerSectionOffset = useCallback((key: string, y: number, scrollContentRelative?: boolean) => {
    if (scrollContentRelative) {
      sectionOffsetsRef.current[key] = y;
    } else {
      localSectionOffsetsRef.current[key] = y;
    }
    // Scroll-to-section on tap/effect uses ref + measure (native) or scrollIntoView (web), not this
  }, []);

  const renderSectionHeader = (key: string, hasContentOrLoading: boolean) => (
    <View
      nativeID={`${LIBRARY_SECTION_ID_PREFIX}${key}`}
      ref={(r) => {
        if (r) sectionHeaderRefsRef.current[key] = r;
      }}
      onLayout={
        Platform.OS === 'web'
          ? undefined
          : (e) => {
              const localY = e.nativeEvent.layout.y;
              registerSectionOffset(key, localY, false);
              const headerNode = sectionHeaderRefsRef.current[key];
              const contentNode = scrollContentRef.current;
              if (headerNode && contentNode && typeof (headerNode as any).measureLayout === 'function') {
                (headerNode as any).measureLayout(contentNode, 0, 0, (_x: number, y: number) => {
                  sectionOffsetsRef.current[key] = y;
                  if (key === targetSectionToScrollRef.current) scrollToOffsetRef.current(y);
                });
              }
            }
      }
    >
      {hasContentOrLoading ? (
        <Text variant="titleSmall" style={styles.decadeHeader}>
          {key}
        </Text>
      ) : (
        <Text variant="titleSmall" style={[styles.decadeHeader, styles.sectionHeaderInvisible]} numberOfLines={1}>
          {key}
        </Text>
      )}
    </View>
  );

  const headerHeight = 56 + insets.top;
  return (
    <View style={styles.container}>
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 8 }]}>
        <Image source={require('../../assets/icon.png')} style={styles.headerLogo} resizeMode="contain" accessibilityLabel="RompMusic" />
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
          ref={setScrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={32}
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <View ref={scrollContentRef} collapsable={false}>
      {anyLoading && (searchQuery ? true : artistsRaw.length === 0 && albumsRaw.length === 0) && (
        <View style={styles.loadingWrap}>
          <Text variant="bodyLarge" style={styles.loadingText}>
            {searchQuery ? 'Searching…' : 'Loading library…'}
          </Text>
        </View>
      )}
      {anyError && !searchQuery && artistsRaw.length === 0 && albumsRaw.length === 0 && (
        <View style={styles.loadingWrap}>
          <Text variant="bodyLarge" style={styles.errorText}>
            Failed to load: {(() => {
              const err = artistsError || albumsError;
              return err instanceof Error ? err.message : String(err);
            })()}
          </Text>
        </View>
      )}
      {allSettledEmpty && !showSuggestions && !searchQuery && (
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
      {searchQuery && !searchResultsLoading && (
        <View style={styles.searchResultsSection}>
          {(searchResults.artists?.length ?? 0) === 0 &&
           (searchResults.albums?.length ?? 0) === 0 &&
           (searchResults.tracks?.length ?? 0) === 0 ? (
            <View style={styles.loadingWrap}>
              <Text variant="bodyLarge" style={styles.loadingText}>No results for “{searchQuery}”</Text>
            </View>
          ) : (
            <>
              {(searchResults.artists?.length ?? 0) > 0 && (
                <>
                  <Text variant="labelLarge" style={styles.searchResultsSectionTitle}>Artists</Text>
                  {(searchResults.artists || []).map((a: { id: number; name: string }) => (
                    <List.Item
                      key={`res-artist-${a.id}`}
                      title={a.name}
                      left={() => <List.Icon icon="account" />}
                      onPress={() => clearSearchAndNavigate(() => navigation.navigate('ArtistDetail', { artistIds: [a.id], artistName: a.name }))}
                      right={(props) => <List.Icon {...props} icon="chevron-right" />}
                      style={styles.searchResultItem}
                    />
                  ))}
                </>
              )}
              {(searchResults.albums?.length ?? 0) > 0 && (
                <>
                  <Text variant="labelLarge" style={styles.searchResultsSectionTitle}>Albums</Text>
                  {(searchResults.albums || []).map((a: { id: number; title: string; artist_name?: string }) => (
                    <List.Item
                      key={`res-album-${a.id}`}
                      title={a.title}
                      description={a.artist_name}
                      left={() => <ArtworkImage type="album" id={a.id} size={48} borderRadius={6} style={styles.searchResultArtwork} defer />}
                      onPress={() => clearSearchAndNavigate(() => navigation.navigate('AlbumDetail', { albumId: a.id }))}
                      right={(props) => <List.Icon {...props} icon="chevron-right" />}
                      style={styles.searchResultItem}
                    />
                  ))}
                </>
              )}
              {(searchResults.tracks?.length ?? 0) > 0 && (
                <>
                  <Text variant="labelLarge" style={styles.searchResultsSectionTitle}>Songs</Text>
                  {(searchResults.tracks || []).map((t: { id: number; title: string; artist_name?: string; album_id: number; album_title?: string }) => (
                    <List.Item
                      key={`res-track-${t.id}`}
                      title={t.title}
                      description={`${t.artist_name ?? 'Unknown'} • ${t.album_title ?? 'Unknown'}`}
                      left={() => (
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation(); handleTrackPlay(t as any, searchResults.tracks || []); }}
                          style={styles.trackListArtworkWrap}
                          activeOpacity={0.8}
                        >
                          <ArtworkImage type="album" id={t.album_id} size={48} borderRadius={6} style={styles.trackListArtwork} defer />
                          <View style={styles.trackListPlayOverlay} pointerEvents="none">
                            <IconButton icon="play" size={24} iconColor="#fff" />
                          </View>
                        </TouchableOpacity>
                      )}
                      onPress={() => clearSearchAndNavigate(() => (navigation as any).navigate('TrackDetail', { trackId: t.id }))}
                      style={styles.trackListItem}
                      accessibilityRole="button"
                      accessibilityLabel={`Play ${t.title}`}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </View>
      )}
      {!searchQuery && tab === 'artists' && (
        <View style={styles.artistsList} onLayout={(e) => { listContentTopRef.current = e.nativeEvent.layout.y; }}>
          {sectionKeys.map((key) => {
            const items = artistsByLetter.find((s) => s.letter === key)?.items ?? [];
            const loading = targetSectionToScroll === key && items.length === 0;
            return (
              <React.Fragment key={key}>
                {renderSectionHeader(key, items.length > 0 || loading)}
                {items.length > 0 ? (
                  items.map((g) => renderArtistRow(g))
                ) : loading ? (
                  <View style={styles.loadingSectionPlaceholder}>
                    <ActivityIndicator size="small" color="#4a9eff" style={styles.loadingSectionSpinner} />
                  </View>
                ) : (
                  <View style={styles.sectionEmpty} />
                )}
              </React.Fragment>
            );
          })}
          {artistsLoadingMore && (
            <View style={styles.loadingMoreRow}>
              <Text variant="bodySmall" style={styles.loadingText}>Loading…</Text>
            </View>
          )}
        </View>
      )}

      {!searchQuery && tab === 'albums' && (
        <>
          <View style={styles.sectionListContent} onLayout={(e) => { listContentTopRef.current = e.nativeEvent.layout.y; }}>
            {sectionKeys.length === 0 ? (
              <View style={[styles.grid, styles.sectionBlock]}>
                {albumGroups.map((g) => renderAlbumCard(g))}
              </View>
            ) : (
              sectionKeys.map((key) => {
                const items = albumsGroupedByDecade
                  ? albumsGroupedByDecade.find((g) => g.decade === key)?.items ?? []
                  : (albumsByLetter?.find((s) => s.letter === key)?.items ?? []) as { displayTitle: string; albumIds: number[]; primaryAlbum: { id: number }; artistNames: string; usePlaceholderArtwork?: boolean }[];
                const loading = targetSectionToScroll === key && items.length === 0;
                return (
                  <React.Fragment key={key}>
                    {renderSectionHeader(key, items.length > 0 || loading)}
                    {items.length > 0 ? (
                      <View style={[styles.grid, styles.sectionBlock]}>
                        {items.map((g) => renderAlbumCard(g))}
                      </View>
                    ) : loading ? (
                      <View style={styles.loadingSectionPlaceholder}>
                        <ActivityIndicator size="small" color="#4a9eff" style={styles.loadingSectionSpinner} />
                        <View style={styles.skeletonGrid}>
                          {Array.from({ length: cardsPerRow * 2 }).map((_, i) => (
                            <View key={i} style={[styles.skeletonCard, { width: cardWidth }]} />
                          ))}
                        </View>
                      </View>
                    ) : (
                      <View style={styles.sectionEmpty} />
                    )}
                  </React.Fragment>
                );
              })
            )}
          </View>
          {albumsLoadingMore && (
            <View style={styles.loadingMoreRow}>
              <Text variant="bodySmall" style={styles.loadingText}>Loading…</Text>
            </View>
          )}
        </>
      )}

          </View>
        </ScrollView>
        {!searchQuery && sectionKeys.length > 0 && !showSuggestions && (
          <SectionIndex
            sectionKeys={sectionKeys}
            currentSection={currentSection}
            onSectionPress={handleSectionPress}
          />
        )}
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
  headerLogo: {
    width: 32,
    height: 32,
    marginLeft: 16,
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
    flexDirection: 'column',
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  loadMoreBtn: {
    marginHorizontal: HORIZONTAL_PADDING,
    marginVertical: 16,
  },
  loadingMoreRow: {
    paddingVertical: 12,
    paddingHorizontal: HORIZONTAL_PADDING,
    alignItems: 'center',
  },
  loadingSectionPlaceholder: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 24,
    minHeight: 280,
  },
  loadingSectionSpinner: {
    marginVertical: 12,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  skeletonCard: {
    height: 120,
    backgroundColor: '#222',
    borderRadius: CARD_RADIUS,
  },
  skeletonList: {
    marginTop: 8,
  },
  skeletonListRow: {
    height: 72,
    backgroundColor: '#222',
    borderRadius: 6,
    marginBottom: 8,
  },
  sectionEmpty: {
    height: 0,
    overflow: 'hidden',
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
  searchResultsSection: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 24,
  },
  searchResultsSectionTitle: {
    color: '#888',
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchResultItem: {
    backgroundColor: '#1a1a1a',
  },
  searchResultArtwork: {
    marginRight: 12,
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
  sectionListContent: {
    flexDirection: 'column',
    flexGrow: 1,
  },
  sectionBlock: {
    marginBottom: 24,
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
  sectionHeaderInvisible: {
    opacity: 0,
    height: 0,
    paddingTop: 0,
    paddingBottom: 0,
    overflow: 'hidden',
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
