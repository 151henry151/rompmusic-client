/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Android/native: re-export react-native-track-player so playerStore can use it.
 * Web build uses trackPlayerBindings.web.ts instead so the package is not bundled.
 */

import type { AddTrack } from 'react-native-track-player';

export type { AddTrack };

let mod: typeof import('react-native-track-player') | null = null;
try {
  mod = require('react-native-track-player') as typeof import('react-native-track-player');
} catch {
  mod = null;
}

export const trackPlayerModule = mod;
