/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Offline library store - tracks which songs are downloaded, recently played,
 * and manages the library metadata cache for instant browsing.
 *
 * Persists to AsyncStorage so state survives app restarts.
 * Native-only download operations; web stubs return early.
 */

import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  downloadTrackAudio,
  downloadArtwork,
  deleteFile,
  getLocalAudioPath,
  getLocalArtworkPath,
  fileExists,
  saveMetadata,
  loadMetadata,
  clearAllOfflineAudio,
  clearAllArtwork,
} from '../services/offlineStorage';
import { api, getToken } from '../api/client';

const STORAGE_KEY = 'rompmusic_offline';
const METADATA_CACHE_KEY = 'library_cache';
const MAX_RECENT_TRACKS = 50;

export interface OfflineTrack {
  id: number;
  title: string;
  album_id: number;
  artist_id: number;
  album_title?: string;
  artist_name?: string;
  track_number: number;
  disc_number: number;
  duration: number;
  format?: string;
  localAudioUri?: string;
}

export interface OfflineAlbum {
  id: number;
  title: string;
  artist_id: number;
  artist_name?: string;
  year?: number | null;
  has_artwork?: boolean | null;
  artwork_hash?: string | null;
  track_count?: number;
  localArtworkUri?: string;
}

export interface LibraryCache {
  albums: OfflineAlbum[];
  updatedAt: number;
}

export type DownloadStatus = 'idle' | 'downloading' | 'downloaded' | 'error';

interface DownloadProgress {
  trackId: number;
  status: DownloadStatus;
}

interface OfflineState {
  /** Tracks explicitly downloaded by the user. */
  downloadedTracks: Record<number, OfflineTrack>;
  /** Recently played track IDs (most recent first, up to MAX_RECENT_TRACKS). */
  recentlyPlayedIds: number[];
  /** Recently played track metadata for offline display. */
  recentlyPlayedTracks: Record<number, OfflineTrack>;
  /** Album artwork cached locally (albumId -> localUri). */
  cachedArtwork: Record<number, string>;
  /** Cached library metadata for instant browsing. */
  libraryCache: LibraryCache | null;
  /** Active download progress tracking. */
  activeDownloads: Record<number, DownloadProgress>;
  /** Whether library cache is being refreshed. */
  isCachingLibrary: boolean;

  // Actions
  downloadTrack: (track: OfflineTrack) => Promise<void>;
  downloadAlbum: (albumId: number) => Promise<void>;
  removeDownload: (trackId: number) => Promise<void>;
  recordRecentPlay: (track: OfflineTrack) => void;
  cacheLibraryMetadata: () => Promise<void>;
  cacheArtworkForAlbum: (albumId: number) => Promise<void>;
  getLocalAudioUri: (trackId: number) => string | undefined;
  getLocalArtworkUri: (albumId: number) => string | undefined;
  isTrackDownloaded: (trackId: number) => boolean;
  isTrackAvailableOffline: (trackId: number) => boolean;
  getOfflineTracks: () => OfflineTrack[];
  getOfflineAlbums: () => OfflineAlbum[];
  clearAllDownloads: () => Promise<void>;
  hydrate: () => Promise<void>;
}

async function persistState(state: Pick<OfflineState, 'downloadedTracks' | 'recentlyPlayedIds' | 'recentlyPlayedTracks' | 'cachedArtwork'>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      downloadedTracks: state.downloadedTracks,
      recentlyPlayedIds: state.recentlyPlayedIds,
      recentlyPlayedTracks: state.recentlyPlayedTracks,
      cachedArtwork: state.cachedArtwork,
    }));
  } catch {
    // persist failure is non-fatal
  }
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  downloadedTracks: {},
  recentlyPlayedIds: [],
  recentlyPlayedTracks: {},
  cachedArtwork: {},
  libraryCache: null,
  activeDownloads: {},
  isCachingLibrary: false,

  downloadTrack: async (track: OfflineTrack) => {
    if (Platform.OS === 'web') return;
    const trackId = track.id;

    set((s) => ({
      activeDownloads: { ...s.activeDownloads, [trackId]: { trackId, status: 'downloading' } },
    }));

    try {
      const localUri = await downloadTrackAudio(trackId);
      if (!localUri) throw new Error('Download failed');

      // Also cache artwork for this album
      let artworkUri = get().cachedArtwork[track.album_id];
      if (!artworkUri) {
        const artUri = await downloadArtwork(track.album_id);
        if (artUri) artworkUri = artUri;
      }

      const offlineTrack: OfflineTrack = { ...track, localAudioUri: localUri };

      set((s) => {
        const newState = {
          downloadedTracks: { ...s.downloadedTracks, [trackId]: offlineTrack },
          cachedArtwork: artworkUri
            ? { ...s.cachedArtwork, [track.album_id]: artworkUri }
            : s.cachedArtwork,
          activeDownloads: { ...s.activeDownloads, [trackId]: { trackId, status: 'downloaded' as DownloadStatus } },
        };
        persistState({ ...s, ...newState });
        return newState;
      });
    } catch {
      set((s) => ({
        activeDownloads: { ...s.activeDownloads, [trackId]: { trackId, status: 'error' as DownloadStatus } },
      }));
    }
  },

  downloadAlbum: async (albumId: number) => {
    if (Platform.OS === 'web') return;
    try {
      const tracks = await api.getTracks({ album_id: albumId, limit: 500 });
      if (!Array.isArray(tracks)) return;
      for (const t of tracks) {
        if (!get().downloadedTracks[t.id]) {
          await get().downloadTrack(t as OfflineTrack);
        }
      }
    } catch {
      // album download failure non-fatal
    }
  },

  removeDownload: async (trackId: number) => {
    const track = get().downloadedTracks[trackId];
    if (track?.localAudioUri) {
      await deleteFile(getLocalAudioPath(trackId));
    }
    set((s) => {
      const { [trackId]: _, ...rest } = s.downloadedTracks;
      const { [trackId]: __, ...restDownloads } = s.activeDownloads;
      const newState = { downloadedTracks: rest, activeDownloads: restDownloads };
      persistState({ ...s, ...newState });
      return newState;
    });
  },

  recordRecentPlay: (track: OfflineTrack) => {
    set((s) => {
      const ids = [track.id, ...s.recentlyPlayedIds.filter((id) => id !== track.id)].slice(0, MAX_RECENT_TRACKS);
      const tracks = { ...s.recentlyPlayedTracks, [track.id]: track };
      // Prune old entries not in recent IDs
      const pruned: Record<number, OfflineTrack> = {};
      for (const id of ids) {
        if (tracks[id]) pruned[id] = tracks[id];
      }
      const newState = { recentlyPlayedIds: ids, recentlyPlayedTracks: pruned };
      persistState({ ...s, ...newState });
      return newState;
    });
  },

  cacheLibraryMetadata: async () => {
    // Skip network fetch if we know we're offline — cached data was already loaded by hydrate().
    try {
      const { useNetworkStore } = require('../hooks/useNetworkStatus');
      if (!useNetworkStore.getState().isOnline) return;
    } catch {
      // network store not yet available; proceed anyway
    }
    set({ isCachingLibrary: true });
    try {
      // Fetch all albums in pages
      const allAlbums: OfflineAlbum[] = [];
      let skip = 0;
      const limit = 200;
      while (true) {
        const page = await api.getAlbums({ skip, limit, sort_by: 'title', order: 'asc', artwork_first: true });
        if (!Array.isArray(page) || page.length === 0) break;
        allAlbums.push(...page);
        if (page.length < limit) break;
        skip += limit;
      }

      const cache: LibraryCache = { albums: allAlbums, updatedAt: Date.now() };
      set({ libraryCache: cache });

      if (Platform.OS !== 'web') {
        await saveMetadata(METADATA_CACHE_KEY, cache);

        // Background-cache artwork for albums that have it
        const artworkState = get().cachedArtwork;
        const toCache = allAlbums.filter((a) => a.has_artwork && !artworkState[a.id]).slice(0, 500);
        for (const album of toCache) {
          try {
            const uri = await downloadArtwork(album.id);
            if (uri) {
              set((s) => ({
                cachedArtwork: { ...s.cachedArtwork, [album.id]: uri },
              }));
            }
          } catch {
            // non-fatal
          }
        }
        // Persist artwork cache
        persistState(get());
      }
    } catch {
      // cache failure non-fatal
    } finally {
      set({ isCachingLibrary: false });
    }
  },

  cacheArtworkForAlbum: async (albumId: number) => {
    if (Platform.OS === 'web') return;
    if (get().cachedArtwork[albumId]) return;
    try {
      const uri = await downloadArtwork(albumId);
      if (uri) {
        set((s) => {
          const newState = { cachedArtwork: { ...s.cachedArtwork, [albumId]: uri } };
          persistState({ ...s, ...newState });
          return newState;
        });
      }
    } catch {
      // non-fatal
    }
  },

  getLocalAudioUri: (trackId: number) => {
    return get().downloadedTracks[trackId]?.localAudioUri;
  },

  getLocalArtworkUri: (albumId: number) => {
    return get().cachedArtwork[albumId];
  },

  isTrackDownloaded: (trackId: number) => {
    return !!get().downloadedTracks[trackId]?.localAudioUri;
  },

  isTrackAvailableOffline: (trackId: number) => {
    return !!get().downloadedTracks[trackId]?.localAudioUri ||
           get().recentlyPlayedIds.includes(trackId);
  },

  getOfflineTracks: () => {
    const { downloadedTracks, recentlyPlayedIds, recentlyPlayedTracks } = get();
    const seen = new Set<number>();
    const result: OfflineTrack[] = [];
    // Downloaded tracks first
    for (const t of Object.values(downloadedTracks)) {
      seen.add(t.id);
      result.push(t);
    }
    // Then recently played (not already included)
    for (const id of recentlyPlayedIds) {
      if (!seen.has(id) && recentlyPlayedTracks[id]) {
        seen.add(id);
        result.push(recentlyPlayedTracks[id]);
      }
    }
    return result;
  },

  getOfflineAlbums: () => {
    const offlineTracks = get().getOfflineTracks();
    const albumMap = new Map<number, OfflineAlbum>();
    for (const t of offlineTracks) {
      if (!albumMap.has(t.album_id)) {
        albumMap.set(t.album_id, {
          id: t.album_id,
          title: t.album_title ?? 'Unknown Album',
          artist_id: t.artist_id,
          artist_name: t.artist_name,
          localArtworkUri: get().cachedArtwork[t.album_id],
        });
      }
    }
    return Array.from(albumMap.values());
  },

  clearAllDownloads: async () => {
    await clearAllOfflineAudio();
    set((s) => {
      const newState = { downloadedTracks: {}, activeDownloads: {} };
      persistState({ ...s, ...newState });
      return newState;
    });
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          downloadedTracks: data.downloadedTracks ?? {},
          recentlyPlayedIds: data.recentlyPlayedIds ?? [],
          recentlyPlayedTracks: data.recentlyPlayedTracks ?? {},
          cachedArtwork: data.cachedArtwork ?? {},
        });
      }
      // Load library cache from disk
      if (Platform.OS !== 'web') {
        const cache = await loadMetadata<LibraryCache>(METADATA_CACHE_KEY);
        if (cache) {
          set({ libraryCache: cache });
        }
      }
    } catch {
      // hydration failure non-fatal
    }
  },
}));
