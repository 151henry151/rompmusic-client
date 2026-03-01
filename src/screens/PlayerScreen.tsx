/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, NativeSyntheticEvent, NativeTouchEvent } from 'react-native';
import Slider from '@react-native-community/slider';
import { Text, IconButton, List, Switch } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePlayerStore } from '../store/playerStore';
import ArtworkImage from '../components/ArtworkImage';
import ZoomableArtworkModal from '../components/ZoomableArtworkModal';
import type { Track } from '../store/playerStore';
import type { AppStackParamList } from '../navigation/types';

interface Props {
  onClose: () => void;
}

const SWIPE_DISMISS_MIN_DRAG = 72;
const SWIPE_DISMISS_DIRECTION_BIAS = 0.6;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlayerScreen({ onClose }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'Library'>>();
  const [artworkModalVisible, setArtworkModalVisible] = React.useState(false);
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

  const dismissTriggeredRef = React.useRef(false);
  const swipeTouchStateRef = React.useRef({ active: false, startX: 0, startY: 0, maxDy: 0 });
  const triggerSwipeDismiss = React.useCallback(() => {
    if (dismissTriggeredRef.current) return;
    dismissTriggeredRef.current = true;
    onClose();
    setTimeout(() => {
      dismissTriggeredRef.current = false;
    }, 300);
  }, [onClose]);
  const getPrimaryTouch = React.useCallback((event: NativeSyntheticEvent<NativeTouchEvent>) => {
    const touches = event.nativeEvent.touches as unknown as Array<{ pageX: number; pageY: number }>;
    if (!Array.isArray(touches) || touches.length === 0) return null;
    return touches[0];
  }, []);
  const handleSwipeTouchStart = React.useCallback((event: NativeSyntheticEvent<NativeTouchEvent>) => {
    const touch = getPrimaryTouch(event);
    if (!touch) return;
    swipeTouchStateRef.current = {
      active: true,
      startX: touch.pageX,
      startY: touch.pageY,
      maxDy: 0,
    };
  }, [getPrimaryTouch]);
  const handleSwipeTouchMove = React.useCallback((event: NativeSyntheticEvent<NativeTouchEvent>) => {
    const state = swipeTouchStateRef.current;
    if (!state.active) return;
    const touch = getPrimaryTouch(event);
    if (!touch) return;
    const dx = touch.pageX - state.startX;
    const dy = touch.pageY - state.startY;
    if (dy > state.maxDy) state.maxDy = dy;
    if (state.maxDy < SWIPE_DISMISS_MIN_DRAG) return;
    if (Math.abs(state.maxDy) < Math.abs(dx) * SWIPE_DISMISS_DIRECTION_BIAS) return;
    state.active = false;
    triggerSwipeDismiss();
  }, [getPrimaryTouch, triggerSwipeDismiss]);
  const handleSwipeTouchEnd = React.useCallback(() => {
    swipeTouchStateRef.current.active = false;
  }, []);

  if (!currentTrack) return null;

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        onTouchStart={handleSwipeTouchStart}
        onTouchMove={handleSwipeTouchMove}
        onTouchEnd={handleSwipeTouchEnd}
        onTouchCancel={handleSwipeTouchEnd}
      >
        <IconButton
          icon="close"
          onPress={onClose}
          style={styles.close}
          accessibilityLabel="Close player"
        />
        <Pressable
          onPress={() => setArtworkModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Open zoomed album artwork"
          style={styles.artworkPressable}
        >
          <ArtworkImage
            type="album"
            id={currentTrack.album_id}
            size={280}
            style={styles.artwork}
          />
        </Pressable>
        <Text variant="headlineSmall" style={styles.title}>
          {currentTrack.title}
        </Text>
        <Text
          variant="bodyLarge"
          style={styles.artist}
          onPress={() => navigation.navigate('ArtistDetail', { artistIds: [currentTrack.artist_id], artistName: currentTrack.artist_name || 'Unknown' })}
        >
          {currentTrack.artist_name || 'Unknown'}
        </Text>
        {currentTrack.album_title && (
          <Text
            variant="bodyMedium"
            style={styles.album}
            onPress={() => navigation.navigate('AlbumDetail', { albumId: currentTrack.album_id })}
          >
            {currentTrack.album_title}
          </Text>
        )}
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
      <ZoomableArtworkModal
        visible={artworkModalVisible}
        albumId={currentTrack.album_id}
        title={currentTrack.album_title || currentTrack.title}
        onClose={() => setArtworkModalVisible(false)}
      />
    </View>
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
  artworkPressable: {
    alignSelf: 'center',
  },
  title: {
    textAlign: 'center',
    color: '#fff',
    marginBottom: 4,
  },
  artist: {
    textAlign: 'center',
    color: '#4a9eff',
    marginBottom: 4,
  },
  album: {
    textAlign: 'center',
    color: '#4a9eff',
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
