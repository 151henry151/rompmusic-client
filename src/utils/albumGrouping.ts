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
}

/**
 * Normalize album title for grouping. Strips trailing " (N)" where N is a number
 * (multi-disc suffix) for comparison.
 */
function normalizeTitleForGrouping(title: string): string {
  const t = title.trim();
  const match = t.match(/^(.*?)\s*\((\d+)\)\s*$/);
  if (match) {
    return match[1].trim().toLowerCase();
  }
  return t.toLowerCase();
}

/**
 * Get display title for a grouped album (without disc number suffix).
 */
export function getAlbumDisplayTitle(title: string): string {
  const t = title.trim();
  const match = t.match(/^(.*?)\s*\((\d+)\)\s*$/);
  if (match) {
    return match[1].trim();
  }
  return t;
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
