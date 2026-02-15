/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Audio service - configures expo-av for gapless playback.
 */

import { Audio } from 'expo-av';

export async function initAudio() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}
