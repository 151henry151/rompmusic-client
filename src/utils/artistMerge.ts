/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Client-side artist merge: groups artists that differ only by capitalization
 * (e.g. "100 Gecs" and "100 gecs") for display. No server or file changes.
 */

export interface ArtistLike {
  id: number;
  name: string;
}

/**
 * Pick the "best" display name from variants that differ only by case.
 * Prefers Title Case (e.g. "100 Gecs") over all-lowercase ("100 gecs").
 */
function pickCanonicalName(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  // Prefer the one that has uppercase letters (intentional capitalization, e.g. "100 Gecs" over "100 gecs")
  const withCaps = names.filter((n) => /[A-Z]/.test(n));
  if (withCaps.length > 0) {
    // Prefer mixed case (Title Case) over ALL CAPS
    const mixedCase = withCaps.filter((n) => /[a-z]/.test(n) && /[A-Z]/.test(n));
    return (mixedCase.length > 0 ? mixedCase : withCaps)[0];
  }
  return names[0];
}

/** Patterns for featured artists (case-insensitive): Feat., ft., Featuring, etc. */
const FEAT_PATTERN = /\s+(?:feat\.?|ft\.?|featuring)\s+/i;

/** Ensemble suffixes to strip: "The Charlie Parker Sextet" -> "Charlie Parker" */
const ENSEMBLE_SUFFIXES = /\s+(?:sextet|septet|quintet|quartet|nonet|trio)\s*$/i;

/** "X & His/Her Orchestra" -> "X" */
const HIS_ORCHESTRA_PATTERN = /\s+&\s+(?:his|her)\s+.+$/i;

/**
 * Extract the primary artist name for grouping.
 * Handles: commas, Feat./ft., ensembles (Sextet/Quintet etc), "& His Orchestra".
 * "The Movement, Elliot Martin" -> "The Movement"
 * "The Movement Feat. Iration" -> "The Movement"
 * "The Charlie Parker Sextet" -> "Charlie Parker"
 * "The Miles Davis Quintet" -> "Miles Davis"
 * "Xavier Cugat & His Waldorf-Astoria Orchestra" -> "Xavier Cugat"
 */
export function getPrimaryArtistName(name: string): string {
  let s = name.trim();
  if (!s) return '';

  const commaIdx = s.indexOf(',');
  if (commaIdx >= 0) s = s.slice(0, commaIdx).trim();

  const featMatch = s.match(FEAT_PATTERN);
  if (featMatch) s = s.slice(0, s.toLowerCase().indexOf(featMatch[0].toLowerCase())).trim();

  const orchestraMatch = s.match(HIS_ORCHESTRA_PATTERN);
  if (orchestraMatch) s = s.slice(0, s.indexOf(orchestraMatch[0])).trim();

  const ensembleMatch = s.match(ENSEMBLE_SUFFIXES);
  if (ensembleMatch) {
    s = s.slice(0, s.length - ensembleMatch[0].length).trim();
    if (s.startsWith('The ') && s.length > 4) {
      s = s.slice(4).trim();
    }
  }

  return s.trim() || name.trim();
}

const ASSORTED_ARTISTS = 'Assorted Artists';
const COMPILATION_MIN_ARTISTS = 3;

export type ArtistGroup = {
  displayName: string;
  artistIds: number[];
  primaryId: number;
  items: (ArtistLike & { has_artwork?: boolean | null; primary_album_id?: number | null; primary_album_title?: string | null })[];
  isAssortedArtists?: boolean;
};

/**
 * Group artists by primary name. Collapses collaborations, ensembles, and compilation artists.
 * - "The Movement, Elliot Martin" and "The Movement Feat. Iration" -> "The Movement"
 * - "The Charlie Parker Sextet" and "The Charlie Parker Septet" -> "Charlie Parker"
 * - Artists from multi-artist compilations (3+ sharing same album title) -> "Assorted Artists"
 */
export function groupArtistsByPrimaryName<T extends ArtistLike & { has_artwork?: boolean | null; primary_album_id?: number | null; primary_album_title?: string | null }>(
  artists: T[]
): ArtistGroup[] {
  const byAlbumTitle = new Map<string, T[]>();
  for (const a of artists) {
    const title = (a.primary_album_title || '').trim().toLowerCase();
    if (title) {
      if (!byAlbumTitle.has(title)) byAlbumTitle.set(title, []);
      byAlbumTitle.get(title)!.push(a);
    }
  }
  const compilationArtistIds = new Set<number>();
  for (const [, items] of byAlbumTitle) {
    if (items.length >= COMPILATION_MIN_ARTISTS) {
      for (const a of items) compilationArtistIds.add(a.id);
    }
  }

  const regular = artists.filter((a) => !compilationArtistIds.has(a.id));
  const byKey = new Map<string, T[]>();
  for (const a of regular) {
    const primary = getPrimaryArtistName(a.name);
    if (!primary) continue;
    const key = primary.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(a);
  }

  const groups: ArtistGroup[] = Array.from(byKey.entries()).map(([, items]) => {
    const artistIds = items.map((i) => i.id);
    const displayName = getPrimaryArtistName(items[0].name);
    const primary = items.find((i) => i.has_artwork) ?? items[0];
    return {
      displayName,
      artistIds,
      primaryId: primary.id,
      items,
    };
  });

  if (compilationArtistIds.size > 0) {
    const compItems = artists.filter((a) => compilationArtistIds.has(a.id));
    const primary = compItems.find((i) => i.has_artwork && i.primary_album_id) ?? compItems[0];
    groups.push({
      displayName: ASSORTED_ARTISTS,
      artistIds: compItems.map((i) => i.id),
      primaryId: primary.id,
      items: compItems,
      isAssortedArtists: true,
    });
  }

  return groups;
}

/**
 * Group artists by normalized name (case-insensitive) and return one entry per group.
 * Each group uses a canonical display name and includes all artist IDs for that group.
 */
export function groupArtistsByNormalizedName<T extends ArtistLike>(
  artists: T[]
): { displayName: string; artistIds: number[]; primaryId: number; items: T[] }[] {
  const byKey = new Map<string, T[]>();
  for (const a of artists) {
    const key = a.name.trim().toLowerCase();
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(a);
  }
  return Array.from(byKey.entries()).map(([_, items]) => {
    const artistIds = items.map((i) => i.id);
    const names = [...new Set(items.map((i) => i.name.trim()))];
    const displayName = pickCanonicalName(names);
    // Primary ID: use the one whose name we're displaying, or the first
    const primary = items.find((i) => i.name.trim() === displayName) ?? items[0];
    return {
      displayName,
      artistIds,
      primaryId: primary.id,
      items,
    };
  });
}
