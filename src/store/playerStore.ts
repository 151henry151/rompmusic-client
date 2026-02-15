/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Gapless playback: preloads next track and transitions seamlessly.
 */

import { create } from 'zustand';
import { Audio } from 'expo-av';
import { api } from '../api/client';
import { getToken } from '../api/client';
import { useSettingsStore } from './settingsStore';

export interface Track {
  id: number;
  title: string;
  album_id: number;
  artist_id: number;
  album_title?: string;
  artist_name?: string;
  track_number: number;
  disc_number: number;
  duration: number;
}

interface PlayerState {
  queue: Track[];
  currentIndex: number;
  currentTrack: Track | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  error: string | null;

  setVolume: (v: number) => Promise<void>;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  playTrack: (track: Track, queue?: Track[]) => Promise<void>;
  addToQueue: (tracks: Track | Track[]) => void;
  playNext: (tracks: Track | Track[]) => void;
  clearQueue: () => void;
  autoplayEnabled: boolean;
  setAutoplay: (enabled: boolean) => void;
}

let sound: Audio.Sound | null = null;
let nextSound: Audio.Sound | null = null;

async function loadAndPlay(
  track: Track,
  onFinish: () => void,
  onPositionUpdate: (pos: number) => void,
  position = 0
): Promise<Audio.Sound> {
  const format = useSettingsStore.getState().getEffectiveStreamFormat();
  let url = api.getStreamUrl(track.id, format);
  const t = getToken();
  if (t) url += (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(t);
  const { sound: s } = await Audio.Sound.createAsync(
    { uri: url },
    { shouldPlay: true, positionMillis: position * 1000, volume: currentVolume },
    (status) => {
      if (status.isLoaded) {
        if (status.didJustFinishAndNotLoop) onFinish();
        else if ('positionMillis' in status) onPositionUpdate(status.positionMillis / 1000);
      }
    }
  );
  try {
    await s.setProgressUpdateIntervalAsync(500);
  } catch {
    // Web may not support; position updates are best-effort
  }
  return s;
}

async function preloadNext(track: Track): Promise<Audio.Sound | null> {
  try {
    const format = useSettingsStore.getState().getEffectiveStreamFormat();
    let url = api.getStreamUrl(track.id, format);
    const t = getToken();
    if (t) url += (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(t);
    const { sound: s } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: false });
    return s;
  } catch {
    return null;
  }
}

let currentVolume = 1;

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: 0,
  currentTrack: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  volume: 1,
  isLoading: false,
  error: null,
  autoplayEnabled: false,

  setVolume: async (v: number) => {
    currentVolume = Math.max(0, Math.min(1, v));
    set({ volume: currentVolume });
    if (sound) {
      try {
        await sound.setVolumeAsync(currentVolume);
      } catch {
        /* best-effort */
      }
    }
  },

  setQueue: (tracks, startIndex = 0) => {
    set({ queue: tracks, currentIndex: startIndex });
  },

  play: async () => {
    const { currentTrack, queue, currentIndex } = get();
    if (!currentTrack) return;
    set({ isPlaying: true, isLoading: true, error: null });
    const onPosition = (pos: number) => set({ position: pos });
    try {
      if (sound) {
        await sound.playAsync();
      } else {
        const nextIndex = currentIndex + 1;
        const nextTrack = nextIndex < queue.length ? queue[nextIndex] : null;
        sound = await loadAndPlay(currentTrack, () => get().skipToNext(), onPosition, get().position);
        if (nextTrack) nextSound = await preloadNext(nextTrack);
      }
      set({ isPlaying: true, isLoading: false });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : 'Playback failed',
      });
    }
  },

  pause: async () => {
    if (sound) {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && 'positionMillis' in status) {
        set({ position: status.positionMillis / 1000 });
      }
      await sound.pauseAsync();
    }
    set({ isPlaying: false });
  },

  seekTo: async (seconds: number) => {
    if (sound) {
      await sound.setPositionAsync(seconds * 1000);
      set({ position: seconds });
    }
  },

  skipToNext: async () => {
    let { queue, currentIndex, currentTrack, autoplayEnabled } = get();
    if (currentIndex + 1 >= queue.length) {
      if (autoplayEnabled && currentTrack) {
        try {
          const similar = await api.getSimilarTracks(currentTrack.id, 15);
          if (similar?.length) {
            const mapped = similar.map((t: { id: number; title: string; album_id: number; artist_id: number; album_title?: string; artist_name?: string; track_number: number; disc_number: number; duration: number }) => ({
              id: t.id,
              title: t.title,
              album_id: t.album_id,
              artist_id: t.artist_id,
              album_title: t.album_title,
              artist_name: t.artist_name,
              track_number: t.track_number,
              disc_number: t.disc_number,
              duration: t.duration,
            }));
            set((s) => ({ queue: [...s.queue, ...mapped] }));
            queue = [...queue, ...mapped];
          }
        } catch {
          /* ignore autoplay fetch errors */
        }
      }
      const state = get();
      if (state.currentIndex + 1 >= state.queue.length) {
        await sound?.unloadAsync();
        await nextSound?.unloadAsync();
        sound = null;
        nextSound = null;
        set({ isPlaying: false, currentTrack: null });
        return;
      }
    }
    const { queue: q, currentIndex: ci } = get();
    const nextIndex = ci + 1;
    const nextTrack = q[nextIndex];
    if (nextSound) {
      await sound?.unloadAsync();
      sound = nextSound;
      nextSound = null;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && 'positionMillis' in status) set({ position: status.positionMillis / 1000 });
      });
      try {
        await sound.setProgressUpdateIntervalAsync(500);
      } catch {
        /* best-effort on web */
      }
      try {
        await sound.setVolumeAsync(currentVolume);
      } catch {
        /* best-effort */
      }
      await sound.playAsync();
      const nextNext = nextIndex + 1 < q.length ? q[nextIndex + 1] : null;
      if (nextNext) nextSound = await preloadNext(nextNext);
    } else {
      await sound?.unloadAsync();
      sound = await loadAndPlay(nextTrack, () => get().skipToNext(), (pos) => set({ position: pos }));
    }
    set({ currentTrack: nextTrack, currentIndex: nextIndex, position: 0, duration: nextTrack.duration });
  },


  skipToPrevious: async () => {
    const { position, queue, currentIndex } = get();
    if (position > 3 && sound) {
      await sound.setPositionAsync(0);
      set({ position: 0 });
      return;
    }
    if (currentIndex <= 0) return;
    const prevTrack = queue[currentIndex - 1];
    await sound?.unloadAsync();
    await nextSound?.unloadAsync();
    nextSound = null;
    sound = await loadAndPlay(prevTrack, () => get().skipToNext(), (pos) => set({ position: pos }));
    set({ currentTrack: prevTrack, currentIndex: currentIndex - 1, position: 0, duration: prevTrack.duration });
  },

  playTrack: async (track, queue = []) => {
    const tracks = queue.length ? queue : [track];
    const idx = tracks.findIndex((t) => t.id === track.id);
    const startIndex = idx >= 0 ? idx : 0;
    set({ queue: tracks, currentIndex: startIndex, currentTrack: track, position: 0, duration: track.duration });
    await get().play();
  },

  addToQueue: (tracks) => {
    const arr = Array.isArray(tracks) ? tracks : [tracks];
    set((s) => ({ queue: [...s.queue, ...arr] }));
  },

  playNext: (tracks) => {
    const arr = Array.isArray(tracks) ? tracks : [tracks];
    set((s) => {
      const { queue, currentIndex } = s;
      const insertAt = currentIndex + 1;
      const next = [...queue];
      next.splice(insertAt, 0, ...arr);
      return { queue: next };
    });
  },

  clearQueue: () => {
    set({ queue: [], currentIndex: 0, currentTrack: null });
  },

  setAutoplay: (enabled) => {
    set({ autoplayEnabled: enabled });
  },
}));
