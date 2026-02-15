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
  /** When false (default), hide albums without artwork on Library and Home. Search always shows all. */
  displayAlbumsWithoutArtwork: boolean;
  /** When false (default), hide artists without artwork on Library and Home. Search always shows all. */
  displayArtistsWithoutArtwork: boolean;
  /** When on, group collaborations (e.g. "The Movement, Elliot Martin") under primary artist ("The Movement"). */
  groupCollaborationsByPrimary: boolean;
  /** Stream format: original file or OGG transcoded. Default: original */
  streamFormat: StreamFormat;
  /** Server policy for client settings (visibility, defaults). Fetched on login. */
  clientConfig: ClientConfigPolicy | null;
  setGroupArtistsByCapitalization: (value: boolean) => void;
  setDisplayAlbumsWithoutArtwork: (value: boolean) => void;
  setDisplayArtistsWithoutArtwork: (value: boolean) => void;
  setGroupCollaborationsByPrimary: (value: boolean) => void;
  setStreamFormat: (value: StreamFormat) => void;
  setClientConfig: (config: ClientConfigPolicy | null) => void;
  restoreSettings: () => Promise<void>;
  fetchClientConfig: () => Promise<void>;
  /** Whether a client setting is visible (user can change it). */
  isSettingVisible: (key: string) => boolean;
  /** Effective value for a setting (respects server policy when hidden) */
  getEffectiveDisplayAlbumsWithoutArtwork: () => boolean;
  getEffectiveDisplayArtistsWithoutArtwork: () => boolean;
  getEffectiveGroupArtistsByCapitalization: () => boolean;
  getEffectiveGroupCollaborationsByPrimary: () => boolean;
  getEffectiveStreamFormat: () => StreamFormat;
}

const defaults = {
  groupArtistsByCapitalization: true,
  displayAlbumsWithoutArtwork: false,
  displayArtistsWithoutArtwork: false,
  groupCollaborationsByPrimary: false,
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

  setDisplayAlbumsWithoutArtwork: (value) => {
    set({ displayAlbumsWithoutArtwork: value });
    AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...get(), displayAlbumsWithoutArtwork: value })
    ).catch(() => {});
  },

  setDisplayArtistsWithoutArtwork: (value) => {
    set({ displayArtistsWithoutArtwork: value });
    AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...get(), displayArtistsWithoutArtwork: value })
    ).catch(() => {});
  },

  setGroupCollaborationsByPrimary: (value) => {
    set({ groupCollaborationsByPrimary: value });
    AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...get(), groupCollaborationsByPrimary: value })
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
        const legacy = parsed.displayItemsWithoutArtwork;
        set({
          groupArtistsByCapitalization: parsed.groupArtistsByCapitalization ?? defaults.groupArtistsByCapitalization,
          displayAlbumsWithoutArtwork: parsed.displayAlbumsWithoutArtwork ?? legacy ?? defaults.displayAlbumsWithoutArtwork,
          displayArtistsWithoutArtwork: parsed.displayArtistsWithoutArtwork ?? legacy ?? defaults.displayArtistsWithoutArtwork,
          groupCollaborationsByPrimary: parsed.groupCollaborationsByPrimary ?? defaults.groupCollaborationsByPrimary,
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

  getEffectiveDisplayAlbumsWithoutArtwork: () => {
    const { clientConfig, displayAlbumsWithoutArtwork } = get();
    const policy = clientConfig?.client_settings?.display_albums_without_artwork;
    if (policy && !policy.visible) return !!policy.default;
    return displayAlbumsWithoutArtwork;
  },
  getEffectiveDisplayArtistsWithoutArtwork: () => {
    const { clientConfig, displayArtistsWithoutArtwork } = get();
    const policy = clientConfig?.client_settings?.display_artists_without_artwork;
    if (policy && !policy.visible) return !!policy.default;
    return displayArtistsWithoutArtwork;
  },
  getEffectiveGroupArtistsByCapitalization: () => {
    const { clientConfig, groupArtistsByCapitalization } = get();
    const policy = clientConfig?.client_settings?.group_artists_by_capitalization;
    if (policy && !policy.visible) return !!policy.default;
    return groupArtistsByCapitalization;
  },
  getEffectiveGroupCollaborationsByPrimary: () => {
    const { clientConfig, groupCollaborationsByPrimary } = get();
    const policy = clientConfig?.client_settings?.group_collaborations_by_primary;
    if (policy && !policy.visible) return !!policy.default;
    return groupCollaborationsByPrimary;
  },
  getEffectiveStreamFormat: () => {
    const { clientConfig, streamFormat } = get();
    const policy = clientConfig?.client_settings?.audio_format;
    if (policy && !policy.visible) return (policy.default === 'ogg' ? 'ogg' : 'original') as StreamFormat;
    return streamFormat;
  },
}));
