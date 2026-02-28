/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Server URL (API base) configuration. Persisted so first-run can prompt, and
 * editable in Settings. EXPO_PUBLIC_API_URL can be used as a web/default
 * fallback, while native setup still requires an explicit saved server URL.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';

const STORAGE_KEY = 'rompmusic_server_url';
const URL_SCHEME_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;

/** Normalize user input to a full API base URL (e.g. https://music.example.com -> https://music.example.com/api/v1). */
export function normalizeServerUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const withScheme = URL_SCHEME_REGEX.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    if (/\/api\/v1$/i.test(cleanPath)) {
      parsed.pathname = cleanPath;
    } else if (!cleanPath || cleanPath === '/') {
      parsed.pathname = '/api/v1';
    } else {
      parsed.pathname = `${cleanPath}/api/v1`;
    }
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    const fallback = withScheme.replace(/\/+$/, '');
    if (/\/api\/v1\/?$/i.test(fallback)) return fallback.replace(/\/+$/, '');
    return `${fallback}/api/v1`;
  }
}

/** Returns true when URL uses insecure HTTP for a non-local host. */
export function isInsecureRemoteHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:') return false;
    const host = parsed.hostname.toLowerCase();
    return host !== 'localhost' && host !== '127.0.0.1' && host !== '::1';
  } catch {
    return false;
  }
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
  /** True if user has configured a server (stored), or web build has env preconfiguration. */
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
    if (value && Platform.OS === 'ios' && isInsecureRemoteHttpUrl(value)) {
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
      if (stored && Platform.OS === 'ios' && isInsecureRemoteHttpUrl(stored)) {
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
