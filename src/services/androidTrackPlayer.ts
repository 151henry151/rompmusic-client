/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Platform } from 'react-native';

type TrackPlayerModule = typeof import('react-native-track-player');
type TrackPlayerBindings = {
  TrackPlayer: TrackPlayerModule['default'];
  AppKilledPlaybackBehavior: TrackPlayerModule['AppKilledPlaybackBehavior'];
  Capability: TrackPlayerModule['Capability'];
  Event: TrackPlayerModule['Event'];
  State: TrackPlayerModule['State'];
};

let initialized = false;
let transitionRecoveryInFlight = false;
let trackPlayerBindings: TrackPlayerBindings | null | undefined;

function getTrackPlayerBindings(): TrackPlayerBindings | null {
  if (Platform.OS !== 'android') return null;
  if (trackPlayerBindings !== undefined) return trackPlayerBindings;
  try {
    const mod = require('react-native-track-player') as TrackPlayerModule;
    trackPlayerBindings = {
      TrackPlayer: mod.default,
      AppKilledPlaybackBehavior: mod.AppKilledPlaybackBehavior,
      Capability: mod.Capability,
      Event: mod.Event,
      State: mod.State,
    };
  } catch {
    // Expo Go does not include custom native modules.
    trackPlayerBindings = null;
  }
  return trackPlayerBindings;
}

function isAlreadyInitializedError(error: unknown): boolean {
  return error instanceof Error && /already been initialized|already initialized/i.test(error.message);
}

export async function initAndroidTrackPlayer(): Promise<void> {
  if (Platform.OS !== 'android' || initialized) return;
  const bindings = getTrackPlayerBindings();
  if (!bindings) return;
  const { TrackPlayer, AppKilledPlaybackBehavior, Capability } = bindings;
  try {
    await TrackPlayer.setupPlayer({
      minBuffer: 20,
      maxBuffer: 180,
      backBuffer: 30,
      playBuffer: 2.5,
      waitForBuffer: true,
      autoHandleInterruptions: true,
      autoUpdateMetadata: true,
    });
  } catch (error) {
    if (!isAlreadyInitializedError(error)) throw error;
  }

  await TrackPlayer.updateOptions({
    progressUpdateEventInterval: 1,
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.Stop,
      Capability.SeekTo,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
    ],
    notificationCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.Stop,
      Capability.SeekTo,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
    ],
    compactCapabilities: [
      Capability.SkipToPrevious,
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
    ],
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      alwaysPauseOnInterruption: false,
      stopForegroundGracePeriod: 30,
    },
  });

  initialized = true;
}

export async function androidPlaybackService(): Promise<void> {
  const bindings = getTrackPlayerBindings();
  if (!bindings) return;
  const { TrackPlayer, Event, State } = bindings;

  const tryRecoverQueueProgression = async (): Promise<void> => {
    if (transitionRecoveryInFlight) return;
    transitionRecoveryInFlight = true;
    try {
      const [playbackState, activeIndex, queue] = await Promise.all([
        TrackPlayer.getPlaybackState(),
        TrackPlayer.getActiveTrackIndex(),
        TrackPlayer.getQueue(),
      ]);
      if (
        playbackState.state === State.Playing ||
        playbackState.state === State.Loading ||
        playbackState.state === State.Buffering
      ) {
        return;
      }
      if (typeof activeIndex !== 'number' || activeIndex < 0 || activeIndex + 1 >= queue.length) return;
      await TrackPlayer.skipToNext();
      await TrackPlayer.play();
    } catch {
      /* no-op */
    } finally {
      transitionRecoveryInFlight = false;
    }
  };

  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    await TrackPlayer.play();
  });
  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    await TrackPlayer.pause();
  });
  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    await TrackPlayer.stop();
  });
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    try {
      await TrackPlayer.skipToNext();
      await TrackPlayer.play();
    } catch {
      /* no-op at queue boundary */
    }
  });
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    try {
      await TrackPlayer.skipToPrevious();
      await TrackPlayer.play();
    } catch {
      /* no-op at queue boundary */
    }
  });
  TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
    await TrackPlayer.seekTo(event.position);
  });
  TrackPlayer.addEventListener(Event.PlaybackState, async (event) => {
    if (event.state === State.Ended) {
      await tryRecoverQueueProgression();
    }
  });
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
    await tryRecoverQueueProgression();
  });
  TrackPlayer.addEventListener(Event.PlaybackError, async () => {
    try {
      await TrackPlayer.retry();
      await TrackPlayer.play();
    } catch {
      await tryRecoverQueueProgression();
    }
  });
}
