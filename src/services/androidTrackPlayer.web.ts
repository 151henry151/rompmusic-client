/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Web stub: no native track player; playback uses expo-audio / web APIs.
 * Prevents react-native-track-player (and shaka-player) from being bundled for web.
 */

export async function initAndroidTrackPlayer(): Promise<void> {
  /* no-op on web */
}

export async function androidPlaybackService(): Promise<void> {
  /* no-op on web */
}
