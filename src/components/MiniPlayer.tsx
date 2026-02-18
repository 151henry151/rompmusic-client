/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import { Text, Icon, IconButton, List, Switch } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePlayerStore } from '../store/playerStore';
import ArtworkImage from './ArtworkImage';
import type { Track } from '../store/playerStore';
import type { AppStackParamList } from '../navigation/types';

interface Props {
  onExpand: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MiniPlayer({ onExpand }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'Library'>>();
  const [queuePanelOpen, setQueuePanelOpen] = useState(false);
  const {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    position,
    duration,
    volume,
    play,
    pause,
    seekTo,
    setVolume,
    playTrack,
    autoplayEnabled,
    setAutoplay,
    autoplayStartIndex,
  } = usePlayerStore();

  if (!currentTrack) return null;

  const progress = duration > 0 ? position / duration : 0;
  const manualEnd = autoplayStartIndex ?? queue.length;
  const manualQueue = queue.slice(0, manualEnd);
  const autoplayNext = autoplayStartIndex != null ? queue.slice(manualEnd) : [];

  return (
    <View style={styles.container}>
      {queuePanelOpen && (
        <View style={styles.queuePanel}>
          <View style={styles.queueCloseRow}>
            <TouchableOpacity
              style={styles.chevronButton}
              onPress={() => setQueuePanelOpen(false)}
              accessibilityLabel="Close queue"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon source="chevron-down" size={20} color="#888" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.queueScroll} contentContainerStyle={styles.queueScrollContent}>
            <Text variant="labelMedium" style={styles.queueSectionTitle}>
              Queue
            </Text>
            {manualQueue.length === 0 && autoplayNext.length === 0 && (
              <Text variant="bodySmall" style={styles.queueEmpty}>Nothing in the queue</Text>
            )}
            {manualQueue.map((t: Track, i: number) => (
              <List.Item
                key={`manual-${t.id}-${i}`}
                title={t.title}
                description={(t.artist_name || 'Unknown') + (t.album_title ? ` • ${t.album_title}` : '')}
                left={() => <ArtworkImage type="album" id={t.album_id} size={40} style={styles.queueArtwork} />}
                onPress={() => {
                  playTrack(t, queue);
                  setQueuePanelOpen(false);
                }}
                style={[styles.queueItem, i === currentIndex && styles.queueItemCurrent]}
                titleStyle={i === currentIndex ? styles.queueItemCurrentTitle : undefined}
              />
            ))}
            <View style={styles.autoplayRow}>
              <Text variant="bodyMedium" style={styles.autoplayLabel}>Autoplay</Text>
              <Switch value={autoplayEnabled} onValueChange={setAutoplay} color="#4a9eff" />
            </View>
            {autoplayEnabled && autoplayNext.length > 0 && (
              <>
                <Text variant="labelMedium" style={styles.queueSectionTitle}>Autoplay next</Text>
                {autoplayNext.map((t: Track, i: number) => (
                  <List.Item
                    key={`autoplay-${t.id}-${manualEnd + i}`}
                    title={t.title}
                    description={(t.artist_name || 'Unknown') + (t.album_title ? ` • ${t.album_title}` : '')}
                    left={() => <ArtworkImage type="album" id={t.album_id} size={40} style={styles.queueArtwork} />}
                    onPress={() => {
                      playTrack(t, queue);
                      setQueuePanelOpen(false);
                    }}
                    style={styles.queueItem}
                  />
                ))}
              </>
            )}
          </ScrollView>
        </View>
      )}

      {!queuePanelOpen && (
        <View style={styles.chevronRow}>
          <TouchableOpacity
            style={styles.chevronButton}
            onPress={() => setQueuePanelOpen(true)}
            accessibilityLabel="Queue"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon source="chevron-up" size={20} color="#888" />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.barRow}>
        <TouchableOpacity
          style={styles.barTouchable}
          onPress={onExpand}
          activeOpacity={1}
          accessibilityRole="button"
          accessibilityLabel={`Now playing: ${currentTrack.title}. Tap to open player`}
        >
          <ArtworkImage type="album" id={currentTrack.album_id} size={48} style={styles.artwork} />
          <View style={styles.info}>
            <Text variant="bodyMedium" numberOfLines={1} style={styles.title}>
              {currentTrack.title}
            </Text>
            <View style={styles.artistAlbumRow}>
              <Text
                variant="bodySmall"
                numberOfLines={1}
                style={styles.artistLink}
                onPress={(e) => { e?.stopPropagation?.(); navigation.navigate('ArtistDetail', { artistIds: [currentTrack.artist_id], artistName: currentTrack.artist_name || 'Unknown' }); }}
              >
                {currentTrack.artist_name || 'Unknown'}
              </Text>
              {currentTrack.album_title ? (
                <>
                  <Text variant="bodySmall" style={styles.artistAlbumSep}> • </Text>
                  <Text
                    variant="bodySmall"
                    numberOfLines={1}
                    style={styles.artistLink}
                    onPress={(e) => { e?.stopPropagation?.(); navigation.navigate('AlbumDetail', { albumId: currentTrack.album_id }); }}
                  >
                    {currentTrack.album_title}
                  </Text>
                </>
              ) : null}
            </View>
            <View style={styles.timeRow}>
              <Text variant="bodySmall" style={styles.time}>{formatTime(position)}</Text>
              <Text variant="bodySmall" style={styles.time}>{formatTime(duration)}</Text>
            </View>
            <View style={styles.progressBlock}>
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
            </View>
          </View>
        </TouchableOpacity>
        <IconButton
          icon={isPlaying ? 'pause' : 'play'}
          onPress={(e) => {
            e?.stopPropagation?.();
            isPlaying ? pause() : play();
          }}
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        />
        <View style={styles.volumeWrap} onStartShouldSetResponder={() => true}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  queuePanel: {
    maxHeight: 320,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  queueCloseRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  queueScroll: {
    maxHeight: 320,
  },
  queueScrollContent: {
    paddingBottom: 12,
  },
  queueSectionTitle: {
    color: '#888',
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 4,
  },
  queueEmpty: {
    color: '#666',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  queueItem: {
    backgroundColor: 'transparent',
  },
  queueItemCurrent: {
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
  },
  queueItemCurrentTitle: {
    color: '#4a9eff',
    fontWeight: '600',
  },
  queueArtwork: {
    marginRight: 8,
  },
  autoplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  autoplayLabel: {
    color: '#fff',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  barTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
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
  artistAlbumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  artistLink: {
    color: '#4a9eff',
  },
  artistAlbumSep: {
    color: '#666',
  },
  chevronRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  chevronButton: {
    padding: 4,
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
  progressBlock: {
    marginTop: 2,
  },
  slider: {
    marginVertical: 0,
    paddingVertical: 0,
  },
  volumeWrap: {
    width: 88,
    marginLeft: 4,
  },
  volumeSlider: {
    width: 88,
    height: 24,
  },
});
