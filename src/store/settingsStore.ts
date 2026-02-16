/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const SETTINGS_KEY = 'rompmusic_settings';

export type StreamFormat = 'original' | 'ogg';

export interface ClientConfigPolicy {
  client_settings: Record<string, { visible: boolean; default: boolean | string; allowed?: string[] }>;
}

export interface SettingsState {
  /** Group artists that differ only by capitalization (e.g. "John Coltrane" and "John coltrane"). Default: true */
  groupArtistsByCapitalization: boolean;
  /** Stream format: original file or OGG transcoded. Default: original */
  streamFormat: StreamFormat;
  /** Server policy for client settings (visibility, defaults). Fetched on login. */
  clientConfig: ClientConfigPolicy | null;
  setGroupArtistsByCapitalization: (value: boolean) => void;
  setStreamFormat: (value: StreamFormat) => void;
  setClientConfig: (config: ClientConfigPolicy | null) => void;
  restoreSettings: () => Promise<void>;
  fetchClientConfig: () => Promise<void>;
  /** Whether a client setting is visible (user can change it). */
  isSettingVisible: (key: string) => boolean;
  /** Effective value for a setting (respects server policy when hidden) */
  getEffectiveGroupArtistsByCapitalization: () => boolean;
  getEffectiveGroupCollaborationsByPrimary: () => boolean;
  getEffectiveStreamFormat: () => StreamFormat;
}

const defaults = {
  groupArtistsByCapitalization: true,
  streamFormat: 'original' as StreamFormat,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...defaults,
  clientConfig: null,

  setGroupArtistsByCapitalization: (value) => {
    set({ groupArtistsByCapitalization: value });
    AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...get(), groupArtistsByCapitalization: value })
    ).catch(() => {});
  },

  setStreamFormat: (value) => {
    set({ streamFormat: value });
    AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...get(), streamFormat: value })
    ).catch(() => {});
  },

  setClientConfig: (config) => set({ clientConfig: config }),

  restoreSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          groupArtistsByCapitalization: parsed.groupArtistsByCapitalization ?? defaults.groupArtistsByCapitalization,
          streamFormat: (parsed.streamFormat === 'ogg' ? 'ogg' : 'original') as StreamFormat,
        });
      }
    } catch {
      // use defaults
    }
  },

  fetchClientConfig: async () => {
    try {
      const { api } = await import('../api/client');
      const data = await api.getClientConfig();
      set({ clientConfig: data });
    } catch {
      set({ clientConfig: null });
    }
  },

  isSettingVisible: (key) => {
    const policy = get().clientConfig?.client_settings?.[key];
    return policy?.visible !== false;
  },

  getEffectiveGroupArtistsByCapitalization: () => {
    const { clientConfig, groupArtistsByCapitalization } = get();
    const policy = clientConfig?.client_settings?.group_artists_by_capitalization;
    if (policy && !policy.visible) return !!policy.default;
    return groupArtistsByCapitalization;
  },
  getEffectiveGroupCollaborationsByPrimary: () => {
    const { clientConfig } = get();
    const policy = clientConfig?.client_settings?.group_collaborations_by_primary;
    return policy ? !!policy.default : true;
  },
  getEffectiveStreamFormat: () => {
    const { clientConfig, streamFormat } = get();
    const policy = clientConfig?.client_settings?.audio_format;
    if (policy && !policy.visible) return (policy.default === 'ogg' ? 'ogg' : 'original') as StreamFormat;
    return streamFormat;
  },
}));
