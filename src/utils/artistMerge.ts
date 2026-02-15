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
