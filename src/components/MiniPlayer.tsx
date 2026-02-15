/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, IconButton, Slider } from 'react-native-paper';
import { usePlayerStore } from '../store/playerStore';
import ArtworkImage from './ArtworkImage';

interface Props {
  onExpand: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MiniPlayer({ onExpand }: Props) {
  const { currentTrack, isPlaying, position, duration, play, pause, seekTo } = usePlayerStore();

  if (!currentTrack) return null;

  const progress = duration > 0 ? position / duration : 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onExpand}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={`Now playing: ${currentTrack.title}. Tap to open player`}
    >
      <View style={styles.row}>
        <ArtworkImage type="album" id={currentTrack.album_id} size={48} style={styles.artwork} />
        <View style={styles.info}>
          <Text variant="bodyMedium" numberOfLines={1} style={styles.title}>
            {currentTrack.title}
          </Text>
          <Text variant="bodySmall" numberOfLines={1} style={styles.artist}>
            {currentTrack.artist_name || 'Unknown'}
          </Text>
          <View style={styles.timeRow}>
            <Text variant="bodySmall" style={styles.time}>{formatTime(position)}</Text>
            <Text variant="bodySmall" style={styles.time}>{formatTime(duration)}</Text>
          </View>
          <Slider
            value={progress}
            onSlidingComplete={(v) => seekTo(v * duration)}
            style={styles.slider}
            color="#4a9eff"
          />
        </View>
        <IconButton
          icon={isPlaying ? 'pause' : 'play'}
          onPress={(e) => {
            e?.stopPropagation?.();
            isPlaying ? pause() : play();
          }}
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  artwork: {
    marginRight: 12,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#fff',
  },
  artist: {
    color: '#888',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  time: {
    color: '#888',
    fontSize: 11,
  },
  slider: {
    marginVertical: 2,
    paddingVertical: 0,
  },
});
