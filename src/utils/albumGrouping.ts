/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Client-side album grouping:
 * 1. Same album, different artists on tracks (e.g. "Dangerous", "Always With Me")
 * 2. Multi-disc albums (e.g. "GRRR! (Super Deluxe) (1)", "(2)", "(3)")
 */

import { getPrimaryArtistName } from './artistMerge';

export interface AlbumLike {
  id: number;
  title: string;
  artist_id?: number;
  artist_name?: string;
  year?: number | null;
  has_artwork?: boolean | null;
  artwork_hash?: string | null;
}

/**
 * Disc-number suffix patterns for multi-disc albums. Applied in order; first match wins.
 * Handles: "Album (1)", "Album (Disc 1)", "Album (CD 1)", "Album (Disc One)", etc.
 */
const DISC_SUFFIX_PATTERNS = [
  /\s*\((?:disc|cd)\s*\d+\)\s*$/i,
  /\s*\((?:disc|cd)\s+(?:one|two|three|four|five|six|seven|eight|nine|ten)\)\s*$/i,
  /\s*\(\d+\)\s*$/, // (1), (2), (3)
  /\s*[-–]\s*(?:disc|cd)\s*\d+\s*$/i,
  /\s*[-–]\s*pt\.?\s*\d+\s*$/i,
  /\s*[-–]\s*part\s+\d+\s*$/i,
];

function stripDiscSuffix(title: string): string {
  let t = title.trim();
  for (const re of DISC_SUFFIX_PATTERNS) {
    const match = t.match(re);
    if (match) {
      t = t.slice(0, t.length - match[0].length).trim();
      break;
    }
  }
  return t;
}

/**
 * Normalize album title for grouping. Strips multi-disc suffixes so
 * "At Fillmore (Disc 1)" and "At Fillmore (Disc 2)" group together.
 */
function normalizeTitleForGrouping(title: string): string {
  return stripDiscSuffix(title).toLowerCase();
}

/**
 * Get display title for a grouped album (without disc number suffix).
 */
export function getAlbumDisplayTitle(title: string): string {
  return stripDiscSuffix(title.trim());
}

/**
 * Group albums by same artwork when hash is set; otherwise by primary artist + title + year
 * so that collaboration variants (e.g. "All. Right. Now." by Satsang vs Satsang/G. Love) and
 * multi-artist same-title albums (e.g. "Amy") merge into one entry.
 */
export function groupAlbumsByArtwork<T extends AlbumLike>(albums: T[]): AlbumGroup[] {
  const byKey = new Map<string, T[]>();
  for (const a of albums) {
    const primaryArtist = getPrimaryArtistName(a.artist_name || 'Unknown').toLowerCase().trim() || '\0';
    const collabKey = `${primaryArtist}|${normalizeTitleForGrouping(a.title)}|${a.year ?? ''}`;
    const key = a.artwork_hash ?? `__collab:${collabKey}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(a);
  }

  let groups: AlbumGroup[] = Array.from(byKey.entries()).map(([, items]) => {
    const displayTitle = getAlbumDisplayTitle(
      items.reduce((best, i) => (i.title.length < best.length ? i.title : best), items[0].title)
    );
    const albumIds = items.map((i) => i.id);
    const artistNames = [...new Set(items.map((i) => i.artist_name || 'Unknown'))].join(', ');
    const primaryAlbum = items.find((i) => i.has_artwork) ?? items[0];
    return {
      displayTitle,
      albumIds,
      primaryAlbum,
      albums: items,
      artistNames,
    };
  });

  groups = mergeDuplicateAlbumTitles(groups);
  return deduplicateAlbumArtwork(groups);
}

/**
 * Group albums that are the same release but split (different artists per track, or multi-disc).
 * Returns groups with displayTitle, albumIds, primaryAlbum (for artwork), and all albums.
 */
export function groupAlbums<T extends AlbumLike>(albums: T[]): {
  displayTitle: string;
  albumIds: number[];
  primaryAlbum: T;
  albums: T[];
  artistNames: string;
}[] {
  const byKey = new Map<string, T[]>();
  for (const a of albums) {
    const key = `${normalizeTitleForGrouping(a.title)}|${a.year ?? ''}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(a);
  }

  return Array.from(byKey.entries()).map(([, items]) => {
    const displayTitle = getAlbumDisplayTitle(items[0].title);
    const albumIds = items.map((i) => i.id);
    const artistNames = [...new Set(items.map((i) => i.artist_name || 'Unknown'))].join(', ');
    const primaryAlbum = items.find((i) => i.has_artwork) ?? items[0];
    return {
      displayTitle,
      albumIds,
      primaryAlbum,
      albums: items,
      artistNames,
    };
  });
}

export type AlbumGroup = {
  displayTitle: string;
  albumIds: number[];
  primaryAlbum: AlbumLike;
  albums: AlbumLike[];
  artistNames: string;
  usePlaceholderArtwork?: boolean;
};

/**
 * Group albums with collaboration logic: by primary artist + title + year.
 * Merges "Kind of Blue" by "Miles Davis" and "Miles Davis Quintet".
 * Ensures no duplicate titles or artwork in the final list.
 */
export function groupAlbumsWithCollab<T extends AlbumLike>(albums: T[]): AlbumGroup[] {
  const byKey = new Map<string, T[]>();
  for (const a of albums) {
    const primaryArtist = getPrimaryArtistName(a.artist_name || 'Unknown').toLowerCase().trim() || '\0';
    const key = `${primaryArtist}|${normalizeTitleForGrouping(a.title)}|${a.year ?? ''}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(a);
  }

  let groups: AlbumGroup[] = Array.from(byKey.entries()).map(([, items]) => {
    const displayTitle = getAlbumDisplayTitle(items[0].title);
    const albumIds = items.map((i) => i.id);
    const artistNames = [...new Set(items.map((i) => i.artist_name || 'Unknown'))].join(', ');
    const primaryAlbum = items.find((i) => i.has_artwork) ?? items[0];
    return {
      displayTitle,
      albumIds,
      primaryAlbum,
      albums: items,
      artistNames,
    };
  });

  groups = mergeDuplicateAlbumTitles(groups);
  return deduplicateAlbumArtwork(groups);
}

function mergeDuplicateAlbumTitles(groups: AlbumGroup[]): AlbumGroup[] {
  const byTitle = new Map<string, AlbumGroup>();
  for (const g of groups) {
    const key = `${g.displayTitle.toLowerCase().trim()}|${g.primaryAlbum.year ?? ''}`;
    const existing = byTitle.get(key);
    if (existing) {
      const allAlbums = [...existing.albums, ...g.albums];
      const primaryAlbum = allAlbums.find((i) => i.has_artwork) ?? allAlbums[0];
      byTitle.set(key, {
        displayTitle: existing.displayTitle,
        albumIds: [...new Set([...existing.albumIds, ...g.albumIds])],
        primaryAlbum,
        albums: allAlbums,
        artistNames: [...new Set([...(existing.artistNames?.split(', ') || []), ...(g.artistNames?.split(', ') || [])])].join(', '),
      });
    } else {
      byTitle.set(key, { ...g });
    }
  }
  return Array.from(byTitle.values());
}

function deduplicateAlbumArtwork(groups: AlbumGroup[]): AlbumGroup[] {
  const usedAlbumIds = new Set<number>();
  return groups.map((g) => {
    const albums = g.albums;
    const primaryAlbum =
      albums.find((i) => i.has_artwork && !usedAlbumIds.has(i.id)) ??
      albums.find((i) => !usedAlbumIds.has(i.id)) ??
      albums[0];
    const usePlaceholderArtwork =
      primaryAlbum.has_artwork !== true || usedAlbumIds.has(primaryAlbum.id);
    if (primaryAlbum.has_artwork === true && !usedAlbumIds.has(primaryAlbum.id)) {
      usedAlbumIds.add(primaryAlbum.id);
    }
    return {
      ...g,
      primaryAlbum,
      usePlaceholderArtwork,
    };
  });
}
