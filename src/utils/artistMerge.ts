/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Client-side artist merge: groups artists that differ only by capitalization
 * (e.g. "John Coltrane" and "John coltrane") for display. No server or file changes.
 */

export interface ArtistLike {
  id: number;
  name: string;
}

/**
 * Pick the "best" display name from variants that differ only by case.
 * Prefers Title Case (e.g. "John Coltrane") over all-lowercase ("John coltrane").
 */
function pickCanonicalName(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  // Prefer the one that has uppercase letters (intentional capitalization, e.g. "100 Gecs" over "100 gecs")
  const withCaps = names.filter((n) => /[A-Z]/.test(n));
  if (withCaps.length > 0) {
    // Prefer mixed case (Title Case) over ALL CAPS; e.g. "John Coltrane" over "John coltrane"
    const mixedCase = withCaps.filter((n) => /[a-z]/.test(n) && /[A-Z]/.test(n));
    return (mixedCase.length > 0 ? mixedCase : withCaps)[0];
  }
  return names[0];
}

/** Patterns for featured artists (case-insensitive): Feat., ft., Featuring, etc. */
const FEAT_PATTERN = /\s+(?:feat\.?|ft\.?|featuring)\s+/i;

/** Ensemble suffixes to strip: "The Charlie Parker Sextet" -> "Charlie Parker" */
const ENSEMBLE_SUFFIXES = /\s+(?:sextet|septet|quintet|quartet|nonet|trio|all[- ]?stars?|orchestra)\s*$/i;

/** "X & His/Her Orchestra" -> "X" */
const HIS_ORCHESTRA_PATTERN = /\s+&\s+(?:his|her)\s+.+$/i;

/** "X And His/Her Orchestra" -> "X" */
const AND_HIS_ORCHESTRA_PATTERN = /\s+and\s+(?:his|her)\s+.+$/i;

/**
 * General band/artist suffixes to strip for grouping. Order matters.
 * - "X and His Orchestra", "X Orchestra", "X Band" -> X
 * - "X - Collaborator" or "X–Y" -> X (hyphen often indicates featured/collab)
 * - "X's Re-Boppers", "X's All-Stars" -> X (possessive + suffix)
 * - "X (Tony Martin)" -> X (lineup/era in parens)
 */
const BAND_SUFFIX_PATTERNS = [
  /\s+(?:and\s+his\s+orchestra|and\s+her\s+orchestra)\s*$/i,
  /\s+(?:orchestra|band)\s*$/i,
  /\s+all[- ]?stars?\s*$/i,
  /\s*[-–]\s+.+$/, // "X - Y" or "X–Y" (collab/featured)
  /'s\s+[\w\s-]{3,}\s*$/, // "X's Re-Boppers", "X's All-Stars" (min 3 chars to avoid "King's X")
  /\s*\([^)]*\)\s*$/, // "X (lineup/era)" parenthetical
];

/**
 * Normalize for grouping key. Accent folding + common alternate spellings
 * (ou/u, etc.) so similar names group together. General rules for any collection;
 * well-known abbreviations use ARTIST_ALIASES.
 */
function normalizeForGrouping(s: string): string {
  let out = s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  // Accent folding
  out = out
    .replace(/[èéêë]/g, 'e')
    .replace(/[àáâä]/g, 'a')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôö]/g, 'o')
    .replace(/ñ/g, 'n')
    .replace(/ç/g, 'c');
  // Common alternate spellings: ou->u (Cugat/Cougat, color/colour variants)
  out = out.replace(/ou/g, 'u');
  return out;
}

/** Split patterns: take first part for "X & Y", "X / Y", "X + Y", "X and the Y" */
function splitOnCollaboration(s: string): string {
  let first = s;
  const patterns: { re: RegExp; skip?: (str: string) => boolean }[] = [
    { re: /\s+and\s+the\s+/i },
    { re: /\s+&\s+/, skip: (str) => HIS_ORCHESTRA_PATTERN.test(str) },
    { re: /\s*&\s*/, skip: (str) => HIS_ORCHESTRA_PATTERN.test(str) }, // CSN&Y, X & Y
    { re: /\s*\/\s*/ },
    { re: /\s+\+\s+/ },
  ];
  for (const { re, skip } of patterns) {
    const match = s.match(re);
    if (match && (!skip || !skip(s))) {
      const idx = s.search(re);
      const candidate = s.slice(0, idx).trim();
      if (candidate.length > 0) first = candidate;
      break;
    }
  }
  return first;
}

/**
 * Extract the primary artist name for grouping.
 * Handles: commas, Feat./ft., ensembles, "& His Orchestra", "And His Orchestra",
 * "X & Y", "X / Y", "X + Y", "X and the Y", "X-Y", band suffixes, (parenthetical).
 */
export function getPrimaryArtistName(name: string): string {
  let s = name.trim();
  if (!s) return '';

  const commaIdx = s.indexOf(',');
  if (commaIdx >= 0) s = s.slice(0, commaIdx).trim();

  const featMatch = s.match(FEAT_PATTERN);
  if (featMatch) s = s.slice(0, s.toLowerCase().indexOf(featMatch[0].toLowerCase())).trim();

  s = splitOnCollaboration(s);

  const orchestraMatch = s.match(HIS_ORCHESTRA_PATTERN);
  if (orchestraMatch) s = s.slice(0, s.indexOf(orchestraMatch[0])).trim();
  const andOrchestraMatch = s.match(AND_HIS_ORCHESTRA_PATTERN);
  if (andOrchestraMatch) s = s.slice(0, s.indexOf(andOrchestraMatch[0])).trim();

  for (const re of BAND_SUFFIX_PATTERNS) {
    const m = s.match(re);
    if (m) {
      s = s.slice(0, s.length - m[0].length).trim();
      break;
    }
  }

  const ensembleMatch = s.match(ENSEMBLE_SUFFIXES);
  if (ensembleMatch) {
    s = s.slice(0, s.length - ensembleMatch[0].length).trim();
  }

  if (s.startsWith('The ') && s.length > 4) {
    s = s.slice(4).trim();
  }

  return s.trim() || name.trim();
}

const ASSORTED_ARTISTS = 'Assorted Artists';
const COMPILATION_MIN_ARTISTS = 3;

/**
 * Well-known artist aliases: abbreviations and common typos that don't follow
 * general patterns. General rules (Feat., Orchestra, ou->u, etc.) handle most
 * cases; this is for edge cases like CSNY, band name typos, etc.
 */
const ARTIST_ALIASES: Record<string, string> = {
  csny: 'crosby stills nash',
  'csn&y': 'crosby stills nash',
  csn: 'crosby stills nash',
  'c s n y': 'crosby stills nash',
  'glen miller': 'glenn miller',
  'mile davis': 'miles davis',
  'xavier cougat': 'xavier cugat',
  'woddy herman': 'woody herman',
};

/**
 * Grouping key: normalized primary name. General rules (patterns + ou->u) apply first;
 * ARTIST_ALIASES overrides for well-known abbreviations.
 */
export function getGroupingKey(name: string): string {
  const normalized = normalizeForGrouping(getPrimaryArtistName(name));
  return ARTIST_ALIASES[normalized] ?? normalized;
}

export type ArtistGroup = {
  displayName: string;
  artistIds: number[];
  primaryId: number;
  items: (ArtistLike & { has_artwork?: boolean | null; primary_album_id?: number | null; primary_album_title?: string | null })[];
  isAssortedArtists?: boolean;
  usePlaceholderArtwork?: boolean;
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

  const byKey = new Map<string, T[]>();
  for (const a of artists) {
    const primary = getPrimaryArtistName(a.name);
    if (!primary) continue;
    const key = getGroupingKey(a.name);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(a);
  }

  const groups: ArtistGroup[] = Array.from(byKey.entries()).map(([, items]) => {
    const artistIds = items.map((i) => i.id);
    const primaryNames = items.map((i) => getPrimaryArtistName(i.name));
    const displayName = pickCanonicalName(primaryNames);
    const withArt = items.find((i) => i.has_artwork);
    const matchingName = items.find((i) => getPrimaryArtistName(i.name) === displayName);
    const primary = withArt ?? matchingName ?? items[0];
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

  const deduped = deduplicateArtwork(groups);
  return mergeDuplicateDisplayNames(deduped);
}

/** Merge any groups with the same display name (e.g. compilation "Assorted Artists" + real artist "Assorted Artists"). */
function mergeDuplicateDisplayNames(groups: ArtistGroup[]): ArtistGroup[] {
  const byName = new Map<string, ArtistGroup>();
  for (const g of groups) {
    const key = g.displayName.toLowerCase().trim() || '\0';
    const existing = byName.get(key);
    if (existing) {
      const allItems = [...existing.items, ...g.items];
      const withArt = allItems.find((i) => (i as { has_artwork?: boolean }).has_artwork);
      const primary = withArt ?? allItems[0];
      byName.set(key, {
        displayName: existing.displayName,
        artistIds: [...new Set([...existing.artistIds, ...g.artistIds])],
        primaryId: primary.id,
        items: allItems,
        isAssortedArtists: existing.isAssortedArtists || g.isAssortedArtists,
      });
    } else {
      byName.set(key, { ...g });
    }
  }
  return deduplicateArtwork(Array.from(byName.values()));
}

/**
 * Assign primary artist and artwork per group. No duplicate images: when an album
 * cover is already used by another artist card, use placeholder instead.
 */
function deduplicateArtwork(groups: ArtistGroup[]): ArtistGroup[] {
  const usedAlbumIds = new Set<number>();
  return groups.map((g) => {
    const items = g.items as { id: number; primary_album_id?: number | null; has_artwork?: boolean }[];
    // Prefer: has artwork + unused album id > any unused album id > has artwork > first
    const primary =
      items.find((i) => i.has_artwork && i.primary_album_id && !usedAlbumIds.has(i.primary_album_id!)) ??
      items.find((i) => i.primary_album_id && !usedAlbumIds.has(i.primary_album_id!)) ??
      items.find((i) => i.has_artwork && i.primary_album_id) ??
      items.find((i) => i.primary_album_id) ??
      items[0];
    const albumId = primary?.primary_album_id ?? null;
    // Use placeholder when no artwork, or when this album is already used by another artist
    const usePlaceholderArtwork = albumId === null || usedAlbumIds.has(albumId);
    if (albumId !== null && !usePlaceholderArtwork) usedAlbumIds.add(albumId);
    return {
      ...g,
      primaryId: primary.id,
      usePlaceholderArtwork,
    };
  });
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
