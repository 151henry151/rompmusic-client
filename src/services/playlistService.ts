/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { api } from '../api/client';

export interface PlaylistTrackOut {
  id: number;
  title: string;
  album_id: number;
  artist_id: number;
  artist: string;
  album: string;
  duration: number;
  position: number;
}

export interface PlaylistCreate {
  name: string;
  description?: string | null;
}

export interface PlaylistUpdate {
  name?: string;
  description?: string | null;
}

export interface PlaylistSummary {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  created_at: string;
  updated_at: string;
  track_count: number;
}

export interface PlaylistOut extends PlaylistSummary {
  tracks: PlaylistTrackOut[];
}

export async function getPlaylists(): Promise<PlaylistSummary[]> {
  return api.getPlaylists() as Promise<PlaylistSummary[]>;
}

export async function createPlaylist(data: PlaylistCreate): Promise<PlaylistOut> {
  return api.createPlaylist(data) as Promise<PlaylistOut>;
}

export async function getPlaylist(id: number): Promise<PlaylistOut> {
  return api.getPlaylist(id) as Promise<PlaylistOut>;
}

export async function updatePlaylist(id: number, data: PlaylistUpdate): Promise<PlaylistOut> {
  return api.updatePlaylist(id, data) as Promise<PlaylistOut>;
}

export async function deletePlaylist(id: number): Promise<void> {
  await api.deletePlaylist(id);
}

export async function addTrackToPlaylist(
  playlistId: number,
  trackId: number,
  position?: number
): Promise<PlaylistOut> {
  return api.addTrackToPlaylist(playlistId, trackId, position) as Promise<PlaylistOut>;
}

export async function removeTrackFromPlaylist(
  playlistId: number,
  trackId: number
): Promise<PlaylistOut> {
  return api.removeTrackFromPlaylist(playlistId, trackId) as Promise<PlaylistOut>;
}

export async function reorderPlaylistTracks(
  playlistId: number,
  trackIds: number[]
): Promise<PlaylistOut> {
  return api.reorderPlaylistTracks(playlistId, trackIds) as Promise<PlaylistOut>;
}
