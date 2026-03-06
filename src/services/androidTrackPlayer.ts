/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Platform } from 'react-native';
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
} from 'react-native-track-player';

let initialized = false;

function isAlreadyInitializedError(error: unknown): boolean {
  return error instanceof Error && /already been initialized|already initialized/i.test(error.message);
}

export async function initAndroidTrackPlayer(): Promise<void> {
  if (Platform.OS !== 'android' || initialized) return;
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
}
