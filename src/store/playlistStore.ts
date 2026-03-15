/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { create } from 'zustand';
import type { PlaylistCreate, PlaylistOut, PlaylistSummary, PlaylistUpdate } from '../services/playlistService';
import * as playlistService from '../services/playlistService';

interface PlaylistState {
  playlists: PlaylistSummary[];
  currentPlaylist: PlaylistOut | null;
  isLoading: boolean;
  error: string | null;
  fetchPlaylists: () => Promise<void>;
  fetchPlaylist: (id: number) => Promise<void>;
  createPlaylist: (data: PlaylistCreate) => Promise<PlaylistOut>;
  updatePlaylist: (id: number, data: PlaylistUpdate) => Promise<PlaylistOut>;
  deletePlaylist: (id: number) => Promise<void>;
  addTrack: (playlistId: number, trackId: number, position?: number) => Promise<PlaylistOut>;
  removeTrack: (playlistId: number, trackId: number) => Promise<PlaylistOut>;
  reorderTracks: (playlistId: number, trackIds: number[]) => Promise<PlaylistOut>;
  clearPlaylistError: () => void;
}

function toSummary(playlist: PlaylistOut): PlaylistSummary {
  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    owner_id: playlist.owner_id,
    created_at: playlist.created_at,
    updated_at: playlist.updated_at,
    track_count: playlist.track_count,
  };
}

function upsertSummary(playlists: PlaylistSummary[], summary: PlaylistSummary): PlaylistSummary[] {
  const existingIndex = playlists.findIndex((playlist) => playlist.id === summary.id);
  if (existingIndex < 0) {
    return [summary, ...playlists];
  }
  const next = [...playlists];
  next[existingIndex] = summary;
  return next;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Request failed';
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  currentPlaylist: null,
  isLoading: false,
  error: null,

  clearPlaylistError: () => set({ error: null }),

  fetchPlaylists: async () => {
    set({ isLoading: true, error: null });
    try {
      const playlists = await playlistService.getPlaylists();
      set({ playlists, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error) });
      throw error;
    }
  },

  fetchPlaylist: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const playlist = await playlistService.getPlaylist(id);
      set((state) => ({
        currentPlaylist: playlist,
        playlists: upsertSummary(state.playlists, toSummary(playlist)),
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error) });
      throw error;
    }
  },

  createPlaylist: async (data: PlaylistCreate) => {
    set({ isLoading: true, error: null });
    try {
      const created = await playlistService.createPlaylist(data);
      set((state) => ({
        playlists: upsertSummary(state.playlists, toSummary(created)),
        currentPlaylist: created,
        isLoading: false,
      }));
      return created;
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error) });
      throw error;
    }
  },

  updatePlaylist: async (id: number, data: PlaylistUpdate) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await playlistService.updatePlaylist(id, data);
      set((state) => ({
        playlists: upsertSummary(state.playlists, toSummary(updated)),
        currentPlaylist:
          state.currentPlaylist && state.currentPlaylist.id === id
            ? updated
            : state.currentPlaylist,
        isLoading: false,
      }));
      return updated;
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error) });
      throw error;
    }
  },

  deletePlaylist: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await playlistService.deletePlaylist(id);
      set((state) => ({
        playlists: state.playlists.filter((playlist) => playlist.id !== id),
        currentPlaylist:
          state.currentPlaylist && state.currentPlaylist.id === id
            ? null
            : state.currentPlaylist,
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error) });
      throw error;
    }
  },

  addTrack: async (playlistId: number, trackId: number, position?: number) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await playlistService.addTrackToPlaylist(playlistId, trackId, position);
      set((state) => ({
        playlists: upsertSummary(state.playlists, toSummary(updated)),
        currentPlaylist:
          state.currentPlaylist && state.currentPlaylist.id === playlistId
            ? updated
            : state.currentPlaylist,
        isLoading: false,
      }));
      return updated;
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error) });
      throw error;
    }
  },

  removeTrack: async (playlistId: number, trackId: number) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await playlistService.removeTrackFromPlaylist(playlistId, trackId);
      set((state) => ({
        playlists: upsertSummary(state.playlists, toSummary(updated)),
        currentPlaylist:
          state.currentPlaylist && state.currentPlaylist.id === playlistId
            ? updated
            : state.currentPlaylist,
        isLoading: false,
      }));
      return updated;
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error) });
      throw error;
    }
  },

  reorderTracks: async (playlistId: number, trackIds: number[]) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await playlistService.reorderPlaylistTracks(playlistId, trackIds);
      set((state) => ({
        playlists: upsertSummary(state.playlists, toSummary(updated)),
        currentPlaylist:
          state.currentPlaylist && state.currentPlaylist.id === playlistId
            ? updated
            : state.currentPlaylist,
        isLoading: false,
      }));
      return updated;
    } catch (error) {
      set({ isLoading: false, error: toErrorMessage(error) });
      throw error;
    }
  },
}));
