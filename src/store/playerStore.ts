/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Gapless playback: preloads next track and transitions seamlessly.
 * Uses expo-audio (expo-av is deprecated).
 */

import { create } from 'zustand';
import { Platform } from 'react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { api } from '../api/client';
import { getToken } from '../api/client';
import { useSettingsStore } from './settingsStore';

/** Web browsers need transcoded OGG; native can use original format. */
function getStreamFormat(): 'original' | 'ogg' {
  if (Platform.OS === 'web') return 'ogg';
  return useSettingsStore.getState().getEffectiveStreamFormat();
}

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
  /** First queue index that was added by autoplay (similar tracks). null = no autoplay segment. */
  autoplayStartIndex: number | null;
}

let sound: AudioPlayer | null = null;
let nextSound: AudioPlayer | null = null;
/** True after we've prestarted nextSound (play at volume 0); reset when we promote. */
let prestartedNext = false;

function getStreamUrl(track: Track): string {
  const format = getStreamFormat();
  let url = api.getStreamUrl(track.id, format);
  const t = getToken();
  if (t) url += (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(t);
  return url;
}

function loadAndPlay(
  track: Track,
  onFinish: () => void,
  onPositionUpdate: (pos: number) => void,
  position = 0
): AudioPlayer {
  const url = getStreamUrl(track);
  const player = createAudioPlayer(url, { updateInterval: 150, downloadFirst: true });
  player.volume = currentVolume;
  if (position > 0) {
    player.seekTo(position);
  }
  let finished = false;
  player.addListener('playbackStatusUpdate', (status) => {
    onPositionUpdate(status.currentTime);
    const dur = status.duration ?? 0;
    const pos = status.currentTime ?? 0;
    if (!prestartedNext && nextSound && dur > 0 && pos >= Math.max(0, dur - 0.4)) {
      prestartedNext = true;
      nextSound.volume = 0;
      nextSound.play();
    }
    const atEnd = status.isLoaded && dur > 0 && pos >= Math.max(0, dur - 0.02);
    if (!finished && (status.didJustFinish || atEnd)) {
      finished = true;
      onFinish();
    }
  });
  player.play();
  return player;
}

function preloadNext(track: Track): AudioPlayer | null {
  try {
    const url = getStreamUrl(track);
    return createAudioPlayer(url, { updateInterval: 150, downloadFirst: true });
  } catch {
    return null;
  }
}

/** Update lock screen / Now Playing metadata (iOS/Android). No-op on web. */
function setLockScreenMetadata(player: AudioPlayer | null, track: Track | null): void {
  if (!player) return;
  const setActive = (player as { setActiveForLockScreen?(active: boolean, metadata?: Record<string, string>): void }).setActiveForLockScreen;
  if (!setActive) return;
  if (!track) {
    setActive.call(player, false);
    return;
  }
  setActive.call(player, true, {
    title: track.title,
    artist: track.artist_name || 'Unknown',
    albumTitle: track.album_title,
    artworkUrl: api.getArtworkUrl('album', track.album_id),
  });
}

/** Call play(); if not loaded yet, call again when isLoaded (keeps preload, no extra request). */
function playNowOrWhenLoaded(player: AudioPlayer): void {
  player.play();
  const status = (player as { currentStatus?: { isLoaded?: boolean } }).currentStatus;
  if (status?.isLoaded) return;
  let done = false;
  const tryPlay = () => {
    if (done) return;
    done = true;
    player.play();
  };
  const t = setTimeout(tryPlay, 4000);
  const unsub = player.addListener('playbackStatusUpdate', (s: { isLoaded?: boolean }) => {
    if (s.isLoaded) {
      clearTimeout(t);
      unsub?.remove?.();
      tryPlay();
    }
  });
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
  autoplayStartIndex: null,

  setVolume: async (v: number) => {
    currentVolume = Math.max(0, Math.min(1, v));
    set({ volume: currentVolume });
    if (sound) sound.volume = currentVolume;
  },

  setQueue: (tracks, startIndex = 0) => {
    set({ queue: tracks, currentIndex: startIndex, autoplayStartIndex: null });
  },

  play: async () => {
    const { currentTrack, queue, currentIndex } = get();
    if (!currentTrack) return;
    set({ isPlaying: true, isLoading: true, error: null });
    const onPosition = (pos: number) => set({ position: pos });
    try {
      if (sound) {
        sound.play();
      } else {
        const nextIndex = currentIndex + 1;
        const nextTrack = nextIndex < queue.length ? queue[nextIndex] : null;
        sound = loadAndPlay(currentTrack, () => get().skipToNext(), onPosition, get().position);
        setLockScreenMetadata(sound, currentTrack);
        if (nextTrack) nextSound = preloadNext(nextTrack);
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
      set({ position: sound.currentTime });
      sound.pause();
    }
    set({ isPlaying: false });
  },

  seekTo: async (seconds: number) => {
    if (sound) {
      await sound.seekTo(seconds);
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
            const startIndex = get().queue.length;
            set((s) => ({ queue: [...s.queue, ...mapped], autoplayStartIndex: startIndex }));
            queue = [...queue, ...mapped];
          }
        } catch {
          /* ignore autoplay fetch errors */
        }
      }
      const state = get();
      if (state.currentIndex + 1 >= state.queue.length) {
        setLockScreenMetadata(sound ?? null, null);
        sound?.remove();
        nextSound?.remove();
        sound = null;
        nextSound = null;
        prestartedNext = false;
        set({ isPlaying: false, currentTrack: null });
        return;
      }
    }
    const { queue: q, currentIndex: ci } = get();
    const nextIndex = ci + 1;
    const nextTrack = q[nextIndex];
    const preloaded = nextSound;
    if (preloaded) {
      nextSound = null;
      prestartedNext = false;
      sound?.remove();
      sound = preloaded;
      sound.volume = currentVolume;
      let finished = false;
      sound.addListener('playbackStatusUpdate', (status) => {
        set({ position: status.currentTime });
        const dur = status.duration ?? 0;
        const pos = status.currentTime ?? 0;
        if (!prestartedNext && nextSound && dur > 0 && pos >= Math.max(0, dur - 0.4)) {
          prestartedNext = true;
          nextSound.volume = 0;
          nextSound.play();
        }
        const atEnd = status.isLoaded && dur > 0 && pos >= Math.max(0, dur - 0.02);
        if (!finished && (status.didJustFinish || atEnd)) {
          finished = true;
          get().skipToNext();
        }
      });
      if (!(sound as { currentStatus?: { playing?: boolean } }).currentStatus?.playing) {
        playNowOrWhenLoaded(sound);
      }
      setLockScreenMetadata(sound, nextTrack);
      const nextNext = nextIndex + 1 < q.length ? q[nextIndex + 1] : null;
      if (nextNext) nextSound = preloadNext(nextNext);
    } else {
      prestartedNext = false;
      sound?.remove();
      sound = loadAndPlay(nextTrack, () => get().skipToNext(), (pos) => set({ position: pos }));
      setLockScreenMetadata(sound, nextTrack);
    }
    set({ currentTrack: nextTrack, currentIndex: nextIndex, position: 0, duration: nextTrack.duration });
  },

  skipToPrevious: async () => {
    const { position, queue, currentIndex } = get();
    if (position > 3 && sound) {
      sound.seekTo(0);
      set({ position: 0 });
      return;
    }
    if (currentIndex <= 0) return;
    const prevTrack = queue[currentIndex - 1];
    sound?.remove();
    nextSound?.remove();
    nextSound = null;
    prestartedNext = false;
    sound = loadAndPlay(prevTrack, () => get().skipToNext(), (pos) => set({ position: pos }));
    setLockScreenMetadata(sound, prevTrack);
    set({ currentTrack: prevTrack, currentIndex: currentIndex - 1, position: 0, duration: prevTrack.duration });
  },

  playTrack: async (track, queue = []) => {
    sound?.remove();
    sound = null;
    nextSound?.remove();
    nextSound = null;
    prestartedNext = false;
    const tracks = queue.length ? queue : [track];
    const idx = tracks.findIndex((t) => t.id === track.id);
    const startIndex = idx >= 0 ? idx : 0;
    set({ queue: tracks, currentIndex: startIndex, currentTrack: track, position: 0, duration: track.duration, autoplayStartIndex: null });
    await get().play();
  },

  addToQueue: (tracks) => {
    const arr = Array.isArray(tracks) ? tracks : [tracks];
    set((s) => ({ queue: [...s.queue, ...arr], autoplayStartIndex: null }));
  },

  playNext: (tracks) => {
    const arr = Array.isArray(tracks) ? tracks : [tracks];
    nextSound?.remove();
    nextSound = null;
    prestartedNext = false;
    set((s) => {
      const { queue, currentIndex } = s;
      const insertAt = currentIndex + 1;
      const next = [...queue];
      next.splice(insertAt, 0, ...arr);
      return { queue: next, autoplayStartIndex: null };
    });
    const { queue: q, currentIndex: ci } = get();
    const newNextIndex = ci + 1;
    if (newNextIndex < q.length) {
      nextSound = preloadNext(q[newNextIndex]);
    }
  },

  clearQueue: () => {
    set({ queue: [], currentIndex: 0, currentTrack: null, autoplayStartIndex: null });
  },

  setAutoplay: (enabled) => {
    set({ autoplayEnabled: enabled });
  },
}));
