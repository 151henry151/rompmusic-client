/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton, Slider } from 'react-native-paper';
import { usePlayerStore } from '../store/playerStore';

interface Props {
  onClose: () => void;
}

export default function PlayerScreen({ onClose }: Props) {
  const { currentTrack, isPlaying, position, duration, play, pause, seekTo, skipToNext, skipToPrevious } =
    usePlayerStore();

  if (!currentTrack) {
    onClose();
    return null;
  }

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={styles.container}>
      <IconButton icon="close" onPress={onClose} style={styles.close} />
      <View style={styles.artwork} />
      <Text variant="headlineSmall" style={styles.title}>
        {currentTrack.title}
      </Text>
      <Text variant="bodyLarge" style={styles.artist}>
        {currentTrack.artist_name || 'Unknown'}
      </Text>
      <Slider
        value={progress}
        onSlidingComplete={(v) => seekTo(v * duration)}
        style={styles.slider}
        color="#4a9eff"
      />
      <View style={styles.controls}>
        <IconButton icon="skip-previous" size={48} onPress={skipToPrevious} />
        <IconButton
          icon={isPlaying ? 'pause' : 'play'}
          size={64}
          onPress={() => (isPlaying ? pause() : play())}
        />
        <IconButton icon="skip-next" size={48} onPress={skipToNext} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 24,
    justifyContent: 'center',
  },
  close: {
    position: 'absolute',
    top: 48,
    right: 8,
  },
  artwork: {
    width: 280,
    height: 280,
    borderRadius: 8,
    backgroundColor: '#333',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    color: '#fff',
    marginBottom: 4,
  },
  artist: {
    textAlign: 'center',
    color: '#888',
    marginBottom: 24,
  },
  slider: {
    marginVertical: 16,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
});
