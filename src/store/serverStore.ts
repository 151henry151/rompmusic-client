/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Server URL (API base) configuration. Persisted so first-run can prompt, and
 * editable in Settings. When EXPO_PUBLIC_API_URL is set (e.g. demo build),
 * that is used and no prompt is shown.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'rompmusic_server_url';

/** Normalize user input to a full API base URL (e.g. https://music.example.com -> https://music.example.com/api/v1). */
export function normalizeServerUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '');
  if (!trimmed) return trimmed;
  if (/\/api\/v1\/?$/.test(trimmed)) return trimmed.replace(/\/+$/, '');
  return `${trimmed.replace(/\/+$/, '')}/api/v1`;
}

interface ServerState {
  /** In-memory API base URL after restore. Null = use env or default. */
  serverUrl: string | null;
  /** True after we've loaded from AsyncStorage (so we know whether to show setup). */
  isRestored: boolean;
  setServerUrl: (url: string | null) => Promise<void>;
  restoreServerUrl: () => Promise<void>;
  /** Effective API base: stored URL, or env, or default. Sync for use in api client. */
  getApiBase: () => string;
  /** True if user has configured a server (stored) or build is preconfigured (env set). */
  hasConfiguredServer: () => boolean;
  /** Human-readable server URL for display (without /api/v1). Null if using env default. */
  getDisplayServerUrl: () => string | null;
}

function getDefaultApiBase(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/v1`;
  }
  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
}

export const useServerStore = create<ServerState>((set, get) => ({
  serverUrl: null,
  isRestored: false,

  setServerUrl: async (url) => {
    const value = url ? normalizeServerUrl(url) || null : null;
    if (value) {
      await AsyncStorage.setItem(STORAGE_KEY, value);
      set({ serverUrl: value });
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
      set({ serverUrl: null });
    }
  },

  restoreServerUrl: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      set({ serverUrl: stored || null, isRestored: true });
    } catch {
      set({ serverUrl: null, isRestored: true });
    }
  },

  getApiBase: () => {
    const { serverUrl } = get();
    if (serverUrl) return serverUrl;
    return process.env.EXPO_PUBLIC_API_URL || getDefaultApiBase();
  },

  hasConfiguredServer: () => {
    const { serverUrl } = get();
    if (serverUrl) return true;
    if (process.env.EXPO_PUBLIC_API_URL) return true;
    return false;
  },

  getDisplayServerUrl: () => {
    const { serverUrl } = get();
    if (serverUrl) return serverUrl.replace(/\/api\/v1\/?$/, '') || serverUrl;
    if (process.env.EXPO_PUBLIC_API_URL) {
      const u = process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '');
      return u || process.env.EXPO_PUBLIC_API_URL;
    }
    return null;
  },
}));
