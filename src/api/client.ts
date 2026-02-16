/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// On web, use full origin + /api/v1 so requests always hit the API (not resolved relative to /app/).
// For native/SSR use env or default.
const API_BASE =
  typeof window !== 'undefined'
    ? `${window.location.origin}/api/v1`
    : (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/v1');

let token: string | null = null;

export function setToken(t: string | null) {
  token = t;
}

export function getToken() {
  return token;
}

/** Build query string, omitting undefined and empty string so we never send e.g. search=undefined */
function toQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') filtered[k] = String(v);
  }
  const q = new URLSearchParams(filtered).toString();
  return q ? '?' + q : '';
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
  const res = await fetch(url, { ...opts, headers, cache: 'no-store' });
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

  getStreamUrl(trackId: number, format?: 'original' | 'ogg') {
    const base = `${API_BASE.replace('/api/v1', '')}/api/v1/stream/${trackId}`;
    if (format && format !== 'original') {
      return base + (base.includes('?') ? '&' : '?') + 'format=' + encodeURIComponent(format);
    }
    return base;
  },

  async getClientConfig() {
    return fetchApi('/config/client') as Promise<{ client_settings: Record<string, { visible: boolean; default: boolean | string; allowed?: string[] }> }>;
  },

  getArtworkUrl(type: 'album', id: number) {
    return `${API_BASE.replace('/api/v1', '')}/api/v1/artwork/${type}/${id}`;
  },

  async getArtists(params?: { skip?: number; limit?: number; search?: string; home?: boolean; sort_by?: string; order?: string }) {
    return fetchApi(`/library/artists${params ? toQueryString(params) : ''}`);
  },

  async getArtist(id: number) {
    return fetchApi(`/library/artists/${id}`);
  },

  async getAlbums(params?: { skip?: number; limit?: number; artist_id?: number; search?: string; sort_by?: string; order?: string; random?: boolean }) {
    return fetchApi(`/library/albums${params ? toQueryString(params) : ''}`);
  },

  async getAlbum(id: number) {
    return fetchApi(`/library/albums/${id}`);
  },

  async getTracks(params?: { skip?: number; limit?: number; album_id?: number; artist_id?: number; search?: string; sort_by?: string; order?: string }) {
    return fetchApi(`/library/tracks${params ? toQueryString(params) : ''}`);
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
