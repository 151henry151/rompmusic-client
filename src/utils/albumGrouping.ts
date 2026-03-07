/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Client-side album grouping:
 * 1. Same album, different artists on tracks (e.g. "Dangerous", "Always With Me")
 * 2. Multi-disc albums (e.g. "GRRR! (Super Deluxe) (1)", "(2)", "(3)")
 */

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

/** Edition suffixes so "Always With Me (Deluxe)" and "Always With Me (Deluxe) [bonus tracks]" group together. */
const EDITION_SUFFIX_PATTERNS = [
  /\s*\((?:deluxe\s*edition|deluxe|bonus\s*tracks?|expanded\s*edition|expanded|special\s*edition|anniversary\s*edition|remaster(?:ed)?|reissue)\)\s*$/i,
  /\s*\[(?:bonus\s*tracks?|deluxe\s*edition|deluxe|expanded\s*edition|expanded)\]\s*$/i,
  /\s*[-–]\s*(?:deluxe\s*edition|deluxe|bonus\s*tracks?|expanded\s*edition)\s*$/i,
  // Format/medium so "Doo-Bop (CD)", "Doo-Bop (Vinyl)" etc. show as one release
  /\s*\((?:cd|vinyl|lp|cassette|digital|streaming)\)\s*$/i,
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

/** Strip edition suffixes (Deluxe, Bonus Tracks, etc.) from the end of a title. Applied repeatedly until none match. */
function stripEditionSuffix(title: string): string {
  let t = title.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const re of EDITION_SUFFIX_PATTERNS) {
      const match = t.match(re);
      if (match) {
        t = t.slice(0, t.length - match[0].length).trim();
        changed = true;
        break;
      }
    }
  }
  return t;
}

/**
 * Normalize album title for grouping. Strips disc and edition suffixes so
 * "Always With Me (Deluxe)" and "Always With Me (Bonus Tracks)" group together.
 */
function normalizeTitleForGrouping(title: string): string {
  return stripEditionSuffix(stripDiscSuffix(title)).toLowerCase();
}

/** Infer release year from title text when metadata year is missing. */
function inferYearFromTitle(title: string): number | null {
  const match = title.match(/\b(19|20)\d{2}\b/);
  if (!match) return null;
  const year = Number(match[0]);
  return Number.isFinite(year) ? year : null;
}

/** Prefer metadata year; fall back to title year like "Your Hit Parade 1942". */
function normalizeReleaseYear(title: string, year?: number | null): number | null {
  const parsedYear = Number(year);
  if (Number.isFinite(parsedYear) && parsedYear > 0) return parsedYear;
  return inferYearFromTitle(title);
}

/**
 * Get display title for a grouped album (without disc number suffix).
 */
export function getAlbumDisplayTitle(title: string): string {
  return stripDiscSuffix(title.trim());
}

/**
 * Key for "same release" detection: same base title (strip disc + edition) and year.
 * When multiple albums in a group share this key, show as one album (e.g. Doo-Bop with duplicate DB rows).
 */
export function getBaseReleaseKey(title: string, year?: number | null): string {
  return `${normalizeTitleForGrouping(title)}|${normalizeReleaseYear(title, year) ?? ''}`;
}

/**
 * Group albums by normalized release key (title + release year).
 * This intentionally ignores per-track/guest-artist variance so compilation albums with
 * mixed track artists stay as one release card instead of being split into false editions.
 */
export function groupAlbumsByArtwork<T extends AlbumLike>(albums: T[]): AlbumGroup[] {
  const byKey = new Map<string, T[]>();
  for (const a of albums) {
    const key = getBaseReleaseKey(a.title, a.year);
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
    const key = getBaseReleaseKey(a.title, a.year);
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
    const key = getBaseReleaseKey(a.title, a.year);
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

  return deduplicateAlbumArtwork(groups);
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
