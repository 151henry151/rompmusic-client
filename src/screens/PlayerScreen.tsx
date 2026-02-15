/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import { Text, IconButton, List, Switch } from 'react-native-paper';
import { usePlayerStore } from '../store/playerStore';
import ArtworkImage from '../components/ArtworkImage';
import type { Track } from '../store/playerStore';

interface Props {
  onClose: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlayerScreen({ onClose }: Props) {
  const {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    position,
    duration,
    volume,
    isLoading,
    error,
    play,
    pause,
    seekTo,
    skipToNext,
    skipToPrevious,
    setVolume,
    playTrack,
    autoplayEnabled,
    setAutoplay,
  } = usePlayerStore();

  React.useEffect(() => {
    if (!currentTrack) onClose();
  }, [currentTrack, onClose]);

  if (!currentTrack) return null;

  const progress = duration > 0 ? position / duration : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <IconButton
        icon="close"
        onPress={onClose}
        style={styles.close}
        accessibilityLabel="Close player"
      />
      <ArtworkImage
        type="album"
        id={currentTrack.album_id}
        size={280}
        style={styles.artwork}
      />
      <Text variant="headlineSmall" style={styles.title}>
        {currentTrack.title}
      </Text>
      <Text variant="bodyLarge" style={styles.artist}>
        {currentTrack.artist_name || 'Unknown'}
      </Text>
      {error && (
        <Text variant="bodySmall" style={styles.error}>
          {error}
        </Text>
      )}
      <Slider
        value={progress}
        minimumValue={0}
        maximumValue={1}
        onSlidingComplete={(v) => seekTo(v * duration)}
        style={styles.slider}
        minimumTrackTintColor="#4a9eff"
        maximumTrackTintColor="#333"
        thumbTintColor="#4a9eff"
      />
      <View style={styles.timeRow}>
        <Text variant="bodySmall" style={styles.time}>{formatTime(position)}</Text>
        <Text variant="bodySmall" style={styles.time}>{formatTime(duration)}</Text>
      </View>
      <View style={styles.controls}>
        <IconButton
          icon="skip-previous"
          size={48}
          onPress={skipToPrevious}
          disabled={isLoading}
          accessibilityLabel="Previous track"
        />
        <IconButton
          icon={isPlaying ? 'pause' : 'play'}
          size={64}
          onPress={() => (isPlaying ? pause() : play())}
          disabled={isLoading}
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        />
        <IconButton
          icon="skip-next"
          size={48}
          onPress={skipToNext}
          disabled={isLoading}
          accessibilityLabel="Next track"
        />
      </View>
      <View style={styles.volumeRow}>
        <Text variant="bodySmall" style={styles.volumeLabel}>Volume</Text>
        <Slider
          value={volume}
          minimumValue={0}
          maximumValue={1}
          onValueChange={(v) => setVolume(v)}
          style={styles.volumeSlider}
          minimumTrackTintColor="#4a9eff"
          maximumTrackTintColor="#333"
          thumbTintColor="#4a9eff"
        />
      </View>
      <View style={styles.autoplayRow}>
        <Text variant="bodyMedium" style={styles.autoplayLabel}>Autoplay</Text>
        <Switch value={autoplayEnabled} onValueChange={setAutoplay} color="#4a9eff" />
      </View>
      {queue.length > 0 && (
        <View style={styles.upNextSection}>
          <Text variant="titleSmall" style={styles.upNextTitle}>Up next</Text>
          {queue.slice(currentIndex + 1, currentIndex + 8).map((t: Track, i: number) => (
            <List.Item
              key={`${t.id}-${currentIndex + i}`}
              title={t.title}
              description={t.artist_name || 'Unknown'}
              left={() => <ArtworkImage type="album" id={t.album_id} size={40} style={styles.queueArtwork} />}
              onPress={() => playTrack(t, queue)}
              style={styles.queueItem}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 24,
    paddingTop: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  close: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  artwork: {
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
    marginVertical: 8,
    width: '100%',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
    width: '100%',
  },
  time: {
    color: '#888',
  },
  error: {
    color: '#f44',
    textAlign: 'center',
    marginBottom: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    width: '100%',
  },
  volumeLabel: {
    color: '#888',
    width: 56,
  },
  volumeSlider: {
    flex: 1,
  },
  autoplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  autoplayLabel: {
    color: '#fff',
    marginRight: 12,
  },
  upNextSection: {
    width: '100%',
    marginTop: 24,
  },
  upNextTitle: {
    color: '#888',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  queueItem: {
    backgroundColor: '#1a1a1a',
  },
  queueArtwork: {
    marginRight: 8,
  },
});
