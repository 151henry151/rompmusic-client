/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Server URL (API base) configuration. Persisted so first-run can prompt, and
 * editable in Settings. Web can use EXPO_PUBLIC_API_URL as a preconfigured
 * default, while native apps prompt the user on first launch.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';

const STORAGE_KEY = 'rompmusic_server_url';
const URL_SCHEME_RE = /^[a-z][a-z0-9+.-]*:\/\//i;

/** Normalize user input to a full API base URL (e.g. https://music.example.com -> https://music.example.com/api/v1). */
export function normalizeServerUrl(input: string): string {
  const raw = input.trim();
  if (!raw) return raw;
  const withScheme = URL_SCHEME_RE.test(raw) ? raw : `https://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return withScheme.replace(/\/+$/, '');
  }
  const originAndPath = `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/+$/, '');
  if (/\/api\/v1$/i.test(originAndPath)) return originAndPath;
  return `${originAndPath}/api/v1`;
}

export function isInsecureHttpUrl(input: string): boolean {
  return input.trim().toLowerCase().startsWith('http://');
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
  /** True if user has configured a server (stored) or web build is preconfigured (env set). */
  hasConfiguredServer: () => boolean;
  /** Human-readable server URL for display (without /api/v1). Null if no configured server. */
  getDisplayServerUrl: () => string | null;
}

function getDefaultApiBase(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/v1`;
  }
  return 'http://localhost:8080/api/v1';
}

export const useServerStore = create<ServerState>((set, get) => ({
  serverUrl: null,
  isRestored: false,

  setServerUrl: async (url) => {
    const value = url ? normalizeServerUrl(url) || null : null;
    if (value && Platform.OS === 'ios' && isInsecureHttpUrl(value)) {
      throw new Error('iOS requires an HTTPS server URL. Use https:// for your RompMusic server.');
    }
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
      if (stored && Platform.OS === 'ios' && isInsecureHttpUrl(stored)) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        set({ serverUrl: null, isRestored: true });
        return;
      }
      set({ serverUrl: stored || null, isRestored: true });
    } catch {
      set({ serverUrl: null, isRestored: true });
    }
  },

  getApiBase: () => {
    const { serverUrl } = get();
    if (serverUrl) return serverUrl;
    if (Platform.OS === 'web' && process.env.EXPO_PUBLIC_API_URL) {
      return normalizeServerUrl(process.env.EXPO_PUBLIC_API_URL);
    }
    return getDefaultApiBase();
  },

  hasConfiguredServer: () => {
    const { serverUrl } = get();
    if (serverUrl) return true;
    if (Platform.OS === 'web' && process.env.EXPO_PUBLIC_API_URL) return true;
    return false;
  },

  getDisplayServerUrl: () => {
    const { serverUrl } = get();
    if (serverUrl) return serverUrl.replace(/\/api\/v1\/?$/, '') || serverUrl;
    if (Platform.OS === 'web' && process.env.EXPO_PUBLIC_API_URL) {
      const normalized = normalizeServerUrl(process.env.EXPO_PUBLIC_API_URL);
      const u = normalized.replace(/\/api\/v1\/?$/, '');
      return u || normalized;
    }
    return null;
  },
}));
