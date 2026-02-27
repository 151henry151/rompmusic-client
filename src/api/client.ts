/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Platform } from 'react-native';
import { useServerStore } from '../store/serverStore';

/** Resolve API base URL from server store (user-configured or env for demo build). */
function getApiBase(): string {
  return useServerStore.getState().getApiBase();
}

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
  const base = getApiBase();
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json; charset=utf-8',
    ...(opts.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const credentials = (opts as RequestInit & { credentials?: RequestCredentials }).credentials
    ?? 'include';
  const res = await fetch(url, { ...opts, headers, cache: 'no-store', credentials });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(parseApiError(err) || `HTTP ${res.status}`);
  }
  if (res.headers.get('content-type')?.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

/** Parse API error response (e.g. {"detail":"Invalid username or password"}) into a readable message. */
function parseApiError(text: string): string {
  try {
    const parsed = JSON.parse(text);
    return typeof parsed?.detail === 'string' ? parsed.detail : text;
  } catch {
    return text;
  }
}

export const api = {
  async login(username: string, password: string) {
    const trimmedUsername = username.trim();
    const usernameCandidates: string[] = [];
    const pushUnique = (value: string) => {
      if (value && !usernameCandidates.includes(value)) usernameCandidates.push(value);
    };
    pushUnique(trimmedUsername);
    if (/[A-Z]/.test(trimmedUsername)) pushUnique(trimmedUsername.toLowerCase());
    if (trimmedUsername.includes('@')) {
      const localPart = trimmedUsername.split('@')[0]?.trim() ?? '';
      pushUnique(localPart);
      if (/[A-Z]/.test(localPart)) pushUnique(localPart.toLowerCase());
    }

    const passwordCandidates = [password];
    const trimmedPassword = password.trim();
    if (trimmedPassword && trimmedPassword !== password) {
      passwordCandidates.push(trimmedPassword);
    }

    let lastInvalidCredError: unknown;
    const isInvalidCredentialError = (error: unknown) =>
      (error instanceof Error ? error.message.toLowerCase() : '').includes('invalid username or password');

    for (const userCandidate of usernameCandidates) {
      for (const passCandidate of passwordCandidates) {
        try {
          const data = await fetchApi('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username: userCandidate, password: passCandidate }),
            credentials: Platform.OS === 'web' ? 'include' : 'omit',
          });
          return data.access_token;
        } catch (error) {
          if (isInvalidCredentialError(error)) {
            lastInvalidCredError = error;
            continue;
          }
          throw error;
        }
      }
    }

    throw lastInvalidCredError ?? new Error('Invalid username or password');
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
    const apiBase = getApiBase();
    const base = `${apiBase.replace(/\/api\/v1\/?$/, '')}/api/v1/stream/${trackId}`;
    if (format && format !== 'original') {
      return base + (base.includes('?') ? '&' : '?') + 'format=' + encodeURIComponent(format);
    }
    return base;
  },

  async getClientConfig() {
    return fetchApi('/config/client') as Promise<{ client_settings: Record<string, { visible: boolean; default: boolean | string; allowed?: string[] }> }>;
  },

  getArtworkUrl(type: 'album', id: number) {
    const apiBase = getApiBase();
    return `${apiBase.replace(/\/api\/v1\/?$/, '')}/api/v1/artwork/${type}/${id}`;
  },

  async getArtists(params?: { skip?: number; limit?: number; search?: string; home?: boolean; sort_by?: string; order?: string }) {
    return fetchApi(`/library/artists${params ? toQueryString(params) : ''}`);
  },

  async getArtist(id: number) {
    return fetchApi(`/library/artists/${id}`);
  },

  async getAlbums(params?: { skip?: number; limit?: number; artist_id?: number; search?: string; sort_by?: string; order?: string; random?: boolean; artwork_first?: boolean }) {
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

  async search(q: string, limit = 20) {
    return fetchApi(`/search?q=${encodeURIComponent(q)}&limit=${Math.min(50, Math.max(1, limit))}`);
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
