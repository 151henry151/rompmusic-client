/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { ScrollView, StyleSheet, Platform, Share, Alert, View, NativeSyntheticEvent, NativeTouchEvent } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { usePlayerStore } from '../store/playerStore';
import ArtworkImage from '../components/ArtworkImage';
import { buildPublicPath } from '../utils/publicWebsiteUrl';

type TrackDetailParams = { trackId: number };
type RootStackParamList = {
  TrackDetail: TrackDetailParams;
  AlbumDetail: { albumId: number; albumIds?: number[]; highlightTrackId?: number };
  ArtistDetail: { artistIds: number[]; artistName: string };
};

const SWIPE_DISMISS_MIN_DRAG = 72;
const SWIPE_DISMISS_DIRECTION_BIAS = 0.6;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TrackDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'TrackDetail'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'TrackDetail'>>();
  const trackId = Number((route.params as { trackId?: number | string }).trackId) || 0;
  const playTrack = usePlayerStore((s) => s.playTrack);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const playNext = usePlayerStore((s) => s.playNext);
  const dismissTriggeredRef = React.useRef(false);
  const swipeTouchStateRef = React.useRef({ active: false, startX: 0, startY: 0, maxDy: 0 });
  const triggerSwipeDismiss = React.useCallback(() => {
    if (dismissTriggeredRef.current) return;
    dismissTriggeredRef.current = true;
    navigation.goBack();
    setTimeout(() => {
      dismissTriggeredRef.current = false;
    }, 300);
  }, [navigation]);
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

  const { data: track, isLoading } = useQuery({
    queryKey: ['track', trackId],
    queryFn: () => api.getTrack(trackId),
  });

  if (isLoading || !track) {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          onTouchStart={handleSwipeTouchStart}
          onTouchMove={handleSwipeTouchMove}
          onTouchEnd={handleSwipeTouchEnd}
          onTouchCancel={handleSwipeTouchEnd}
        >
          <Text style={styles.muted}>Loading...</Text>
        </ScrollView>
      </View>
    );
  }

  const handlePlay = async () => {
    const tracks = await api.getTracks({ album_id: track.album_id });
    await playTrack(track, tracks);
  };

  const handleViewAlbum = () => {
    navigation.navigate('AlbumDetail', { albumId: track.album_id, highlightTrackId: track.id });
  };

  const handleArtistPress = () => {
    navigation.navigate('ArtistDetail', { artistIds: [track.artist_id], artistName: track.artist_name || 'Unknown' });
  };

  const handleAlbumPress = () => {
    navigation.navigate('AlbumDetail', { albumId: track.album_id, highlightTrackId: track.id });
  };

  const getTrackUrl = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return `${window.location.origin}/track/${track.id}`;
    }
    return buildPublicPath(`/track/${track.id}`);
  };

  const handleShare = async () => {
    const url = getTrackUrl();
    const title = track.title;
    const message = `${track.title}${track.artist_name ? ` – ${track.artist_name}` : ''}`;
    try {
      if (Platform.OS !== 'web' && Share.share) {
        await Share.share({
          message: `${message}\n${url}`,
          url: Platform.OS === 'ios' ? url : undefined,
          title,
        });
      } else if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text: message, url });
      } else if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        Alert.alert('Link copied', 'Track link copied to clipboard.');
      } else {
        Alert.alert('Share', url);
      }
    } catch {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(url);
          Alert.alert('Link copied', 'Track link copied to clipboard.');
        } catch {
          Alert.alert('Share', url);
        }
      } else {
        Alert.alert('Share', url);
      }
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        onTouchStart={handleSwipeTouchStart}
        onTouchMove={handleSwipeTouchMove}
        onTouchEnd={handleSwipeTouchEnd}
        onTouchCancel={handleSwipeTouchEnd}
      >
        <ArtworkImage type="album" id={track.album_id} size={200} style={styles.artwork} />
        <Text variant="headlineSmall" style={styles.title}>
          {track.title}
        </Text>
        <Text variant="bodyLarge" style={styles.artist} onPress={handleArtistPress}>
          {track.artist_name || 'Unknown'}
        </Text>
        <Text variant="bodyMedium" style={styles.album} onPress={handleAlbumPress}>
          {track.album_title || 'Unknown Album'}
        </Text>
        <Text variant="bodySmall" style={styles.duration}>
          {formatDuration(track.duration)}
        </Text>
        <Button mode="contained" onPress={handlePlay} style={styles.playButton} icon="play">
          Play
        </Button>
        <Button mode="outlined" onPress={() => addToQueue(track)} style={styles.albumButton} icon="playlist-plus">
          Add to queue
        </Button>
        <Button mode="outlined" onPress={() => playNext(track)} style={styles.albumButton} icon="play-circle">
          Play next
        </Button>
        <Button mode="outlined" onPress={handleViewAlbum} style={styles.albumButton} icon="album">
          View album
        </Button>
        <Button mode="outlined" onPress={handleShare} style={styles.albumButton} icon="share-variant">
          Share
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  artwork: {
    marginBottom: 24,
  },
  title: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  artist: {
    color: '#4a9eff',
    textAlign: 'center',
    marginBottom: 4,
  },
  album: {
    color: '#4a9eff',
    textAlign: 'center',
    marginBottom: 4,
  },
  duration: {
    color: '#666',
    marginBottom: 24,
  },
  playButton: {
    marginBottom: 12,
  },
  albumButton: {
    marginBottom: 24,
  },
  muted: {
    padding: 24,
    color: '#666',
  },
});
