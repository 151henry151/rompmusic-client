/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Web stub: no react-native-track-player. Playback uses expo-audio only.
 */

export interface AddTrack {
  id: string;
  url: string;
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
  duration?: number;
}

export const trackPlayerModule: null = null;
