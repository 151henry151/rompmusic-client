/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Audio service - configures expo-audio for playback.
 */

import { setAudioModeAsync } from 'expo-audio';

export async function initAudio() {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'duckOthers',
  });
}
