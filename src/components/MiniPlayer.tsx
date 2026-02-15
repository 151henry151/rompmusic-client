/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { usePlayerStore } from '../store/playerStore';

interface Props {
  onExpand: () => void;
}

export default function MiniPlayer({ onExpand }: Props) {
  const { currentTrack, isPlaying, play, pause } = usePlayerStore();

  if (!currentTrack) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onExpand}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={`Now playing: ${currentTrack.title}. Tap to open player`}
    >
      <View style={styles.info}>
        <Text variant="bodyMedium" numberOfLines={1} style={styles.title}>
          {currentTrack.title}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} style={styles.artist}>
          {currentTrack.artist_name || 'Unknown'}
        </Text>
      </View>
      <IconButton
        icon={isPlaying ? 'pause' : 'play'}
        onPress={(e) => {
          e?.stopPropagation?.();
          isPlaying ? pause() : play();
        }}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  info: {
    flex: 1,
  },
  title: {
    color: '#fff',
  },
  artist: {
    color: '#888',
  },
});
