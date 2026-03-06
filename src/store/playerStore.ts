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

/**
 * Stream format selection:
 * - Respect configured effective format on every platform.
 * - On Safari/WebKit, force original because OGG is not supported reliably.
 */
function getStreamFormat(): 'original' | 'ogg' {
  const preferred = useSettingsStore.getState().getEffectiveStreamFormat();
  if (Platform.OS === 'web') {
    if (
      preferred === 'ogg' &&
      typeof navigator !== 'undefined' &&
      navigator.vendor?.includes('Apple') &&
      typeof navigator.userAgent === 'string' &&
      !navigator.userAgent.includes('CriOS') &&
      !navigator.userAgent.includes('FxiOS')
    ) {
      return 'original';
    }
    return preferred;
  }
  return preferred;
}

/** Start prestarting (play next at volume 0) this many seconds before end so it has time to load. Load time can be ~12s with transcoding or slow networks. */
const PRESTART_BEFORE_END_SEC = 15;
/** Consider track ended and promote next this many seconds before actual end (short overlap for gapless). Widen slightly so we advance even if the last status update is slightly before true end (fixes Android not advancing). */
const PROMOTE_BEFORE_END_SEC = 0.5;
/** When track duration is 0 or unknown (e.g. stream), use this as fallback so we still advance. */
const UNKNOWN_DURATION_FALLBACK_SEC = 600;

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
  /** Call when app goes to background (screen off). Enables catch-up when app returns. */
  onAppBackground: () => void;
  /** Call when app becomes active. Advances to correct track if we missed end while backgrounded. */
  onAppActive: () => void;
}

let sound: AudioPlayer | null = null;
let nextSound: AudioPlayer | null = null;
/** True after we've prestarted nextSound (play at volume 0); reset when we promote. */
let prestartedNext = false;
/** On Android, when true we use native ExoPlayer queue (setQueue) so next track plays while device is locked. */
let useNativeQueueAndroid = false;
/** When app went to background (screen off). Used to catch up and advance tracks on resume. */
let backgroundedAt: number | null = null;
let positionAtBackground = 0;
let durationAtBackground = 0;
/** Time-based advance: fires when current track would end so next track starts even if app is backgrounded (JS callbacks throttled). */
let scheduledAdvanceTimeoutId: ReturnType<typeof setTimeout> | null = null;
/** Track whether app is currently foregrounded; use strict end detection in foreground to avoid truncation. */
let isAppInForeground = true;
let backgroundTrackId: number | null = null;

function clearScheduledAdvance(): void {
  if (scheduledAdvanceTimeoutId != null) {
    clearTimeout(scheduledAdvanceTimeoutId);
    scheduledAdvanceTimeoutId = null;
  }
}

/** Schedule advancing to next track after remainingMs. Only invokes onAdvance if currentTrack.id still matches (avoids double-advance). */
function scheduleAdvance(remainingMs: number, trackId: number, onAdvance: () => void): void {
  clearScheduledAdvance();
  if (remainingMs <= 0 || Platform.OS === 'web') return;
  scheduledAdvanceTimeoutId = setTimeout(() => {
    scheduledAdvanceTimeoutId = null;
    const state = usePlayerStore.getState();
    if (state.currentTrack?.id === trackId) onAdvance();
  }, remainingMs);
}

/** All active players so we can stop every one before starting new playback (avoids multiple tracks playing). */
const activePlayers = new Set<AudioPlayer>();
let suppressRemoteSkipDetectionUntil = 0;
let remoteSkipInFlight = false;
let onAppActiveInFlight = false;

function trySetAndroidNativeQueue(player: AudioPlayer, urls: string[], startIndex: number): boolean {
  const setQueueFn = (
    player as unknown as {
      setQueue?: ((urisJson: string, startIndex: number) => void) | ((uris: string[], startIndex: number) => void);
    }
  ).setQueue;
  if (typeof setQueueFn !== 'function') return false;
  // Support both patched and upstream queue signatures.
  try {
    (setQueueFn as (urisJson: string, index: number) => void).call(player, JSON.stringify(urls), startIndex);
    return true;
  } catch {
    try {
      (setQueueFn as (uris: string[], index: number) => void).call(player, urls, startIndex);
      return true;
    } catch {
      return false;
    }
  }
}

function trySeekToAndroidNativeQueueIndex(player: AudioPlayer, index: number): boolean {
  const seekToMediaItem = (player as unknown as { seekToMediaItem?: (targetIndex: number) => void }).seekToMediaItem;
  if (typeof seekToMediaItem !== 'function') return false;
  try {
    seekToMediaItem.call(player, index);
    return true;
  } catch {
    return false;
  }
}

function syncFromAndroidNativeQueueStatus(): boolean {
  if (!useNativeQueueAndroid || !sound) return false;
  const state = usePlayerStore.getState();
  const status = (sound as unknown as {
    currentStatus?: { currentMediaItemIndex?: number; currentTime?: number; duration?: number };
  }).currentStatus;
  const idx = status?.currentMediaItemIndex;
  if (typeof idx !== 'number' || idx < 0 || idx >= state.queue.length) return false;
  const track = state.queue[idx];
  const pos = status?.currentTime ?? sound.currentTime ?? 0;
  const statusDur = status?.duration ?? 0;
  const dur = statusDur > 0 ? statusDur : (track.duration ?? 0);
  setLockScreenMetadata(sound, track);
  usePlayerStore.setState({
    currentIndex: idx,
    currentTrack: track,
    position: pos,
    duration: dur,
  });
  return true;
}

function stopAndRemoveAllPlayers(): void {
  for (const p of activePlayers) {
    try {
      p.pause();
    } catch {
      /* ignore */
    }
    try {
      p.remove();
    } catch {
      /* ignore */
    }
    activePlayers.delete(p);
  }
  sound = null;
  nextSound = null;
  prestartedNext = false;
  useNativeQueueAndroid = false;
  clearScheduledAdvance();
}

function removePlayer(p: AudioPlayer | null): void {
  if (!p) return;
  // Deactivate lock-screen ownership before removing to avoid races where
  // a released old player clears metadata for the new active player.
  try {
    const deactivate = (p as { setActiveForLockScreen?: (active: boolean) => void }).setActiveForLockScreen;
    deactivate?.call(p, false);
  } catch {
    /* ignore */
  }
  try {
    p.pause();
  } catch {
    /* ignore */
  }
  try {
    p.remove();
  } catch {
    /* ignore */
  }
  activePlayers.delete(p);
}

function getStreamUrl(track: Track): string {
  const format = getStreamFormat();
  let url = api.getStreamUrl(track.id, format);
  const t = getToken();
  if (t) url += (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(t);
  return url;
}

function getArtworkMetadataUrl(track: Track): string {
  let url = api.getArtworkUrl('album', track.album_id);
  const t = getToken();
  if (t) url += (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(t);
  return url;
}

/**
 * Expo Audio currently maps some headset/car media commands to seek-by-interval actions.
 * Detect those ±10s jumps and map them to queue previous/next track behavior.
 */
function handleRemoteTrackCommandFromSeekDelta(deltaSeconds: number): boolean {
  const now = Date.now();
  if (now < suppressRemoteSkipDetectionUntil || remoteSkipInFlight) return false;
  const abs = Math.abs(deltaSeconds);
  if (abs < 8.5 || abs > 11.5) return false;
  remoteSkipInFlight = true;
  suppressRemoteSkipDetectionUntil = now + 1200;
  const action = deltaSeconds > 0
    ? usePlayerStore.getState().skipToNext
    : usePlayerStore.getState().skipToPrevious;
  Promise.resolve(action()).finally(() => {
    setTimeout(() => {
      remoteSkipInFlight = false;
    }, 350);
  });
  return true;
}

function loadAndPlay(
  track: Track,
  onFinish: () => void,
  onPositionUpdate: (pos: number) => void,
  position = 0,
  onPlaybackStarted?: () => void
): AudioPlayer {
  const url = getStreamUrl(track);
  const player = createAudioPlayer(url, { updateInterval: 150, downloadFirst: false });
  activePlayers.add(player);
  player.volume = currentVolume;
  if (position > 0) {
    player.seekTo(position);
  }
  let finished = false;
  let startedNotified = false;
  let lastObservedPos = position;
  let endFallbackTimeout: ReturnType<typeof setTimeout> | null = null;
  const clearEndFallback = () => {
    if (endFallbackTimeout != null) {
      clearTimeout(endFallbackTimeout);
      endFallbackTimeout = null;
    }
  };
  player.addListener('playbackStatusUpdate', (status) => {
    onPositionUpdate(status.currentTime);
    if (onPlaybackStarted && !startedNotified && (status.isLoaded || (status.currentTime ?? 0) > 0)) {
      startedNotified = true;
      onPlaybackStarted();
    }
    const reportedDur = status.duration ?? 0;
    const dur = reportedDur > 0 ? reportedDur : track.duration ?? 0;
    const pos = status.currentTime ?? 0;
    if (Platform.OS !== 'web') {
      const delta = pos - lastObservedPos;
      if (handleRemoteTrackCommandFromSeekDelta(delta)) return;
      lastObservedPos = pos;
    }
    if (!prestartedNext && nextSound && dur > 0 && pos >= Math.max(0, dur - PRESTART_BEFORE_END_SEC)) {
      prestartedNext = true;
      nextSound.volume = 0;
      nextSound.play();
    }
    const allowEarlyTransition = !isAppInForeground;
    const atEnd =
      allowEarlyTransition &&
      (status.isLoaded || pos > 0) &&
      dur > 0 &&
      pos >= Math.max(0, dur - PROMOTE_BEFORE_END_SEC);
    if (!finished && (status.didJustFinish || atEnd)) {
      finished = true;
      clearEndFallback();
      clearScheduledAdvance();
      if (sound === player) onFinish();
    }
  });
  // Background-only fallback: if status updates stop before end while backgrounded, force advance.
  const effectiveDuration = (track.duration ?? 0) > 0 ? (track.duration ?? 0) : UNKNOWN_DURATION_FALLBACK_SEC;
  const fallbackMs = isAppInForeground ? 0 : Math.max(0, effectiveDuration * 0.95 * 1000);
  if (fallbackMs > 0) {
    endFallbackTimeout = setTimeout(() => {
      endFallbackTimeout = null;
      if (!finished && sound === player) {
        finished = true;
        clearScheduledAdvance();
        onFinish();
      }
    }, fallbackMs);
  }
  // Time-based advance: when device is locked, JS status updates are throttled. Use only while backgrounded.
  const trackDur = (track.duration ?? 0) > 0 ? (track.duration ?? 0) : UNKNOWN_DURATION_FALLBACK_SEC;
  const remainingMs = trackDur > 0 && position < trackDur ? (trackDur - position) * 1000 : 0;
  if (!isAppInForeground && remainingMs > 0) {
    scheduleAdvance(remainingMs, track.id, () => {
      if (!finished && sound === player) {
        finished = true;
        clearEndFallback();
        onFinish();
      }
    });
  }
  player.play();
  return player;
}

function preloadNext(track: Track): AudioPlayer | null {
  try {
    const url = getStreamUrl(track);
    const player = createAudioPlayer(url, { updateInterval: 150, downloadFirst: true });
    activePlayers.add(player);
    return player;
  } catch {
    return null;
  }
}

/** Update lock screen / Now Playing metadata (iOS/Android). No-op on web. */
function setLockScreenMetadata(player: AudioPlayer | null, track: Track | null): void {
  if (!player) return;
  try {
    const setActive = (player as {
      setActiveForLockScreen?(
        active: boolean,
        metadata?: Record<string, string | undefined>,
        options?: { showSeekForward?: boolean; showSeekBackward?: boolean }
      ): void;
    }).setActiveForLockScreen;
    const updateMetadata = (player as {
      updateLockScreenMetadata?(metadata: Record<string, string | undefined>): void;
    }).updateLockScreenMetadata;
    if (!setActive) return;
    if (!track) {
      setActive.call(player, false);
      return;
    }
    const metadata = {
      title: track.title,
      artist: track.artist_name || 'Unknown',
      albumTitle: track.album_title,
      artworkUrl: getArtworkMetadataUrl(track),
    };
    setActive.call(player, true, metadata, {
      showSeekForward: true,
      showSeekBackward: true,
    });
    updateMetadata?.call(player, metadata);
  } catch {
    /* ignore lock-screen metadata failures so queue playback keeps running */
  }
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
    if (Platform.OS === 'android' && tracks.length <= 1) useNativeQueueAndroid = false;
    set({ queue: tracks, currentIndex: startIndex, autoplayStartIndex: null });
  },

  play: async () => {
    const { currentTrack, queue, currentIndex } = get();
    if (!currentTrack) return;
    set({ isPlaying: true, isLoading: true, error: null });
    const onPosition = (pos: number) => set({ position: pos });
    const onPlaybackStarted = () => set({ isLoading: false });
    try {
      if (sound) {
        sound.play();
        set({ isLoading: false });
      } else if (Platform.OS === 'android' && queue.length > 1) {
        // Native queue: ExoPlayer advances to next track when current ends, even when device is locked.
        // If setQueue/addListener aren't available (e.g. patch not applied or method not exposed to JS), fall back to single-track path.
        try {
          stopAndRemoveAllPlayers();
          sound = createAudioPlayer(getStreamUrl(currentTrack), { updateInterval: 150, downloadFirst: false });
          const urls = queue.map((t) => getStreamUrl(t));
          if (!trySetAndroidNativeQueue(sound, urls, currentIndex)) throw new Error('setQueue not available');
          useNativeQueueAndroid = true;
          activePlayers.add(sound);
          const q = queue;
          sound.addListener('playbackStatusUpdate', (status: { currentMediaItemIndex?: number; currentTime?: number; duration?: number }) => {
            onPosition(status.currentTime ?? 0);
            const idx = status.currentMediaItemIndex;
            if (idx !== undefined && idx >= 0 && idx < q.length && idx !== get().currentIndex) {
              const track = q[idx];
              set({ currentIndex: idx, currentTrack: track, position: 0, duration: track.duration ?? 0 });
              setLockScreenMetadata(sound, track);
            }
          });
          sound.volume = currentVolume;
          setLockScreenMetadata(sound, currentTrack);
          playNowOrWhenLoaded(sound);
          set({ isLoading: false });
        } catch (e) {
          if (sound) {
            removePlayer(sound);
            sound = null;
          }
          useNativeQueueAndroid = false;
          console.warn('Native Android queue unavailable; falling back to JS track advancement', e);
          const nextIndex = currentIndex + 1;
          const nextTrack = nextIndex < queue.length ? queue[nextIndex] : null;
          sound = loadAndPlay(currentTrack, () => get().skipToNext(), onPosition, get().position, onPlaybackStarted);
          setLockScreenMetadata(sound, currentTrack);
          if (nextTrack) nextSound = preloadNext(nextTrack);
        }
      } else {
        const nextIndex = currentIndex + 1;
        const nextTrack = nextIndex < queue.length ? queue[nextIndex] : null;
        sound = loadAndPlay(currentTrack, () => get().skipToNext(), onPosition, get().position, onPlaybackStarted);
        setLockScreenMetadata(sound, currentTrack);
        if (nextTrack) nextSound = preloadNext(nextTrack);
        // Keep isLoading true until onPlaybackStarted fires (stream has started)
      }
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : 'Playback failed',
      });
    }
  },

  pause: async () => {
    clearScheduledAdvance();
    if (sound) {
      set({ position: sound.currentTime });
      sound.pause();
    }
    set({ isPlaying: false });
  },

  seekTo: async (seconds: number) => {
    if (sound) {
      clearScheduledAdvance();
      suppressRemoteSkipDetectionUntil = Date.now() + 1600;
      await sound.seekTo(seconds);
      set({ position: seconds });
      const { currentTrack, duration } = get();
      if (!isAppInForeground && currentTrack && duration > 0 && seconds < duration) {
        const remainingMs = (duration - seconds) * 1000;
        if (remainingMs > 0) scheduleAdvance(remainingMs, currentTrack.id, () => get().skipToNext());
      }
    }
  },

  skipToNext: async () => {
    clearScheduledAdvance();
    suppressRemoteSkipDetectionUntil = Date.now() + 1000;
    let { queue, currentIndex, currentTrack, autoplayEnabled } = get();
    if (useNativeQueueAndroid && sound && currentIndex + 1 < queue.length) {
      const nextIndex = currentIndex + 1;
      if (trySeekToAndroidNativeQueueIndex(sound, nextIndex)) {
        const nextTrack = queue[nextIndex];
        set({ currentIndex: nextIndex, currentTrack: nextTrack, position: 0, duration: nextTrack.duration ?? 0 });
        setLockScreenMetadata(sound, nextTrack);
        return;
      }
      useNativeQueueAndroid = false;
    }
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
        removePlayer(sound ?? null);
        removePlayer(nextSound);
        sound = null;
        nextSound = null;
        prestartedNext = false;
        useNativeQueueAndroid = false;
        set({ isPlaying: false, currentTrack: null });
        return;
      }
    }
    const { queue: q, currentIndex: ci } = get();
    const nextIndex = ci + 1;
    const nextTrack = q[nextIndex];
    const preloaded = nextSound;
    // On Android, avoid reusing the preloaded player when advancing: it can play the previous track's URL (wrong-audio bug). Always load next track fresh on Android.
    const usePreloaded = preloaded && Platform.OS !== 'android';
    if (usePreloaded) {
      nextSound = null;
      prestartedNext = false;
      removePlayer(sound);
      sound = preloaded;
      // If we prestarted 15s before end, the track may have been playing silently; ensure we're at the start when we unmute.
      await sound.seekTo(0);
      sound.volume = currentVolume;
      let finished = false;
      let lastObservedPos = 0;
      sound.addListener('playbackStatusUpdate', (status) => {
        set({ position: status.currentTime });
        const reportedDur = status.duration ?? 0;
        const dur = reportedDur > 0 ? reportedDur : nextTrack.duration ?? 0;
        const pos = status.currentTime ?? 0;
        if (Platform.OS !== 'web') {
          const delta = pos - lastObservedPos;
          if (handleRemoteTrackCommandFromSeekDelta(delta)) return;
          lastObservedPos = pos;
        }
        if (!prestartedNext && nextSound && dur > 0 && pos >= Math.max(0, dur - PRESTART_BEFORE_END_SEC)) {
          prestartedNext = true;
          nextSound.volume = 0;
          nextSound.play();
        }
        const allowEarlyTransition = !isAppInForeground;
        const atEnd =
          allowEarlyTransition &&
          (status.isLoaded || pos > 0) &&
          dur > 0 &&
          pos >= Math.max(0, dur - PROMOTE_BEFORE_END_SEC);
        if (!finished && (status.didJustFinish || atEnd)) {
          finished = true;
          clearScheduledAdvance();
          if (sound === preloaded) get().skipToNext();
        }
      });
      if (!(sound as { currentStatus?: { playing?: boolean } }).currentStatus?.playing) {
        playNowOrWhenLoaded(sound);
      }
      setLockScreenMetadata(sound, nextTrack);
      const dur = nextTrack.duration ?? 0;
      if (!isAppInForeground && dur > 0) scheduleAdvance(dur * 1000, nextTrack.id, () => get().skipToNext());
      const nextNext = nextIndex + 1 < q.length ? q[nextIndex + 1] : null;
      if (nextNext) nextSound = preloadNext(nextNext);
    } else {
      if (preloaded) {
        removePlayer(preloaded);
        nextSound = null;
      }
      prestartedNext = false;
      removePlayer(sound);
      sound = loadAndPlay(nextTrack, () => get().skipToNext(), (pos) => set({ position: pos }));
      setLockScreenMetadata(sound, nextTrack);
    }
    set({ currentTrack: nextTrack, currentIndex: nextIndex, position: 0, duration: nextTrack.duration });
  },

  skipToPrevious: async () => {
    suppressRemoteSkipDetectionUntil = Date.now() + 1000;
    const { position, queue, currentIndex } = get();
    if (useNativeQueueAndroid && sound && currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      if (trySeekToAndroidNativeQueueIndex(sound, prevIndex)) {
        const prevTrack = queue[prevIndex];
        set({ currentIndex: prevIndex, currentTrack: prevTrack, position: 0, duration: prevTrack.duration ?? 0 });
        setLockScreenMetadata(sound, prevTrack);
        return;
      }
      useNativeQueueAndroid = false;
    }
    if (position > 3 && sound) {
      sound.seekTo(0);
      set({ position: 0 });
      return;
    }
    if (currentIndex <= 0) return;
    const prevTrack = queue[currentIndex - 1];
    removePlayer(sound);
    removePlayer(nextSound);
    nextSound = null;
    prestartedNext = false;
    sound = loadAndPlay(prevTrack, () => get().skipToNext(), (pos) => set({ position: pos }));
    setLockScreenMetadata(sound, prevTrack);
    set({ currentTrack: prevTrack, currentIndex: currentIndex - 1, position: 0, duration: prevTrack.duration });
  },

  playTrack: async (track, queue = []) => {
    stopAndRemoveAllPlayers();
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
    removePlayer(nextSound);
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
    if (!enabled) return;
    const { currentTrack, queue, autoplayStartIndex } = get();
    if (!currentTrack || autoplayStartIndex != null) return;
    (async () => {
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
        }
      } catch {
        /* ignore */
      }
    })();
  },

  onAppBackground: () => {
    const { isPlaying, position, duration, currentTrack } = get();
    if (Platform.OS === 'web') return;
    isAppInForeground = false;
    if (useNativeQueueAndroid) {
      backgroundedAt = null;
      backgroundTrackId = null;
      return;
    }
    const livePosition = sound?.currentTime ?? position;
    const liveDuration = sound?.duration ?? duration;
    if (isPlaying && currentTrack && liveDuration > 0) {
      backgroundedAt = Date.now();
      backgroundTrackId = currentTrack.id;
      positionAtBackground = livePosition;
      durationAtBackground = liveDuration;
      const remainingMs = (liveDuration - livePosition) * 1000;
      if (remainingMs > 0) {
        scheduleAdvance(remainingMs, currentTrack.id, () => get().skipToNext());
      }
    } else {
      backgroundTrackId = null;
    }
  },

  onAppActive: async () => {
    if (Platform.OS === 'web') return;
    isAppInForeground = true;
    clearScheduledAdvance();
    if (onAppActiveInFlight) return;
    onAppActiveInFlight = true;
    try {
      // Native queue path: sync from current media item and do not run JS elapsed catch-up.
      if (useNativeQueueAndroid && sound) {
        syncFromAndroidNativeQueueStatus();
        backgroundedAt = null;
        backgroundTrackId = null;
        return;
      }
      // Catch-up: if we were backgrounded and track(s) would have ended, advance to correct track
      if (backgroundedAt != null) {
        const stateAtResume = get();
        // If playback already advanced while backgrounded, do not run elapsed catch-up.
        if (backgroundTrackId != null && stateAtResume.currentTrack?.id !== backgroundTrackId) {
          backgroundedAt = null;
          backgroundTrackId = null;
        } else {
        const elapsedMs = Date.now() - backgroundedAt;
        backgroundedAt = null;
        backgroundTrackId = null;
        const remainingSec = Math.max(0, durationAtBackground - positionAtBackground);
        // Conservative fallback: advance at most one track on resume.
        if (remainingSec >= 2 && elapsedMs >= (remainingSec + 1) * 1000) {
          const state = stateAtResume;
          if (state.currentTrack && state.currentIndex + 1 < state.queue.length) {
            await get().skipToNext();
          }
        }
        }
      }
      // When app comes to foreground, check actual player state: if current track has ended
      // (e.g. we missed the status callback while backgrounded), advance so playback continues.
      const state = get();
      if (sound && state.currentTrack && state.currentIndex + 1 < state.queue.length) {
        const pos = sound.currentTime ?? 0;
        const liveDur = sound.duration ?? 0;
        const dur = liveDur > 0 ? liveDur : (state.duration ?? 0);
        const status = (sound as { currentStatus?: { didJustFinish?: boolean; playing?: boolean } }).currentStatus;
        // If playback is actively progressing mid-track, never force a resume skip.
        if (status?.playing && dur > 0 && pos < Math.max(0, dur - 1)) return;
        if (dur > 0 && (pos >= Math.max(0, dur - 0.5) || status?.didJustFinish)) {
          await get().skipToNext();
        }
      }
    } finally {
      onAppActiveInFlight = false;
    }
  },
}));
