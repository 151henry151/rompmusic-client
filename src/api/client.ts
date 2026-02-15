/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

let token: string | null = null;

export function setToken(t: string | null) {
  token = t;
}

export function getToken() {
  return token;
}

async function fetchApi(path: string, opts: RequestInit = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  if (res.headers.get('content-type')?.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

export const api = {
  async login(username: string, password: string) {
    const data = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    return data.access_token;
  },

  async register(username: string, email: string, password: string) {
    return fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  },

  async verifyEmail(email: string, code: string) {
    return fetchApi('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  },

  async forgotPassword(email: string) {
    return fetchApi('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(email: string, code: string, newPassword: string) {
    return fetchApi('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, new_password: newPassword }),
    });
  },

  async getMe() {
    return fetchApi('/auth/me');
  },

  getStreamUrl(trackId: number) {
    return `${API_BASE.replace('/api/v1', '')}/api/v1/stream/${trackId}`;
  },

  getArtworkUrl(type: 'album' | 'artist', id: number) {
    return `${API_BASE.replace('/api/v1', '')}/api/v1/artwork/${type}/${id}`;
  },

  async getArtists(params?: { skip?: number; limit?: number; search?: string; home?: boolean; sort_by?: string; order?: string }) {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return fetchApi(`/library/artists${q ? '?' + q : ''}`);
  },

  async getArtist(id: number) {
    return fetchApi(`/library/artists/${id}`);
  },

  async getAlbums(params?: { skip?: number; limit?: number; artist_id?: number; search?: string; sort_by?: string; order?: string }) {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return fetchApi(`/library/albums${q ? '?' + q : ''}`);
  },

  async getAlbum(id: number) {
    return fetchApi(`/library/albums/${id}`);
  },

  async getTracks(params?: { skip?: number; limit?: number; album_id?: number; artist_id?: number; search?: string; sort_by?: string; order?: string }) {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return fetchApi(`/library/tracks${q ? '?' + q : ''}`);
  },

  async getRecentlyAdded(limit = 20) {
    return fetchApi(`/library/tracks/recently-added?limit=${limit}`);
  },

  async getRecentlyPlayed(limit = 20) {
    return fetchApi(`/library/tracks/recently-played?limit=${limit}`);
  },

  async getMostPlayed(limit = 20) {
    return fetchApi(`/library/tracks/most-played?limit=${limit}`);
  },

  async getFrequentlyPlayed(limit = 20) {
    return fetchApi(`/library/tracks/frequently-played?limit=${limit}`);
  },

  async getSimilarTracks(trackId: number, limit = 20) {
    return fetchApi(`/library/tracks/similar?track_id=${trackId}&limit=${limit}`);
  },

  async getRecommendedTracks(limit = 20) {
    return fetchApi(`/library/tracks/recommended?limit=${limit}`);
  },

  async getTrack(id: number) {
    return fetchApi(`/library/tracks/${id}`);
  },

  async search(q: string) {
    return fetchApi(`/search?q=${encodeURIComponent(q)}`);
  },

  async getPlaylists() {
    return fetchApi('/playlists');
  },

  async getPlaylist(id: number) {
    return fetchApi(`/playlists/${id}`);
  },

  async getPlaylistTracks(id: number) {
    return fetchApi(`/playlists/${id}/tracks`);
  },

  async createPlaylist(name: string, description?: string) {
    return fetchApi('/playlists', {
      method: 'POST',
      body: JSON.stringify({ name, description, is_public: false }),
    });
  },

  async addTrackToPlaylist(playlistId: number, trackId: number) {
    return fetchApi(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ track_id: trackId }),
    });
  },
};
