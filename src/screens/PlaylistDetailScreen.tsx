/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, IconButton, List, Menu, Text } from 'react-native-paper';
import type { AppStackParamList } from '../navigation/types';
import { usePlayerStore } from '../store/playerStore';
import { usePlaylistStore } from '../store/playlistStore';

function toPlayerTrack(track: {
  id: number;
  title: string;
  album_id: number;
  artist_id: number;
  album: string;
  artist: string;
  duration: number;
  position: number;
}) {
  return {
    id: track.id,
    title: track.title,
    album_id: track.album_id,
    artist_id: track.artist_id,
    album_title: track.album,
    artist_name: track.artist,
    track_number: track.position + 1,
    disc_number: 1,
    duration: track.duration,
  };
}

export default function PlaylistDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'PlaylistDetail'>>();
  const route = useRoute<RouteProp<AppStackParamList, 'PlaylistDetail'>>();
  const { playlistId } = route.params;
  const currentPlaylist = usePlaylistStore((state) => state.currentPlaylist);
  const isLoading = usePlaylistStore((state) => state.isLoading);
  const error = usePlaylistStore((state) => state.error);
  const fetchPlaylist = usePlaylistStore((state) => state.fetchPlaylist);
  const deletePlaylist = usePlaylistStore((state) => state.deletePlaylist);
  const removeTrack = usePlaylistStore((state) => state.removeTrack);
  const reorderTracks = usePlaylistStore((state) => state.reorderTracks);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const [menuTrackId, setMenuTrackId] = useState<string | null>(null);

  const playlist = currentPlaylist && currentPlaylist.id === playlistId ? currentPlaylist : null;
  const tracks = playlist?.tracks ?? [];

  useFocusEffect(
    useCallback(() => {
      fetchPlaylist(playlistId).catch(() => {});
    }, [fetchPlaylist, playlistId])
  );

  const handleDeletePlaylist = useCallback(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const shouldDelete = window.confirm('Delete this playlist and all playlist entries?');
      if (shouldDelete) {
        deletePlaylist(playlistId)
          .then(() => navigation.goBack())
          .catch(() => {});
      }
      return;
    }
    Alert.alert(
      'Delete playlist',
      'Delete this playlist and all playlist entries?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePlaylist(playlistId)
              .then(() => navigation.goBack())
              .catch(() => {});
          },
        },
      ]
    );
  }, [deletePlaylist, navigation, playlistId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: playlist?.name || 'Playlist',
      headerRight: () => (
        <View style={styles.headerActions}>
          <IconButton
            icon="pencil"
            iconColor="#fff"
            onPress={() => navigation.navigate('PlaylistEdit', { playlistId })}
            accessibilityLabel="Edit playlist"
          />
          <IconButton
            icon="trash-can-outline"
            iconColor="#fff"
            onPress={handleDeletePlaylist}
            accessibilityLabel="Delete playlist"
          />
        </View>
      ),
    });
  }, [navigation, playlist?.name, playlistId, handleDeletePlaylist]);

  const handlePlayAll = async () => {
    if (!tracks.length) return;
    const queue = tracks.map(toPlayerTrack);
    await playTrack(queue[0], queue);
  };

  const handleMoveTrack = async (trackIndex: number, target: 'top' | 'bottom') => {
    const ids = tracks.map((track) => track.id);
    const [moved] = ids.splice(trackIndex, 1);
    const reordered = target === 'top' ? [moved, ...ids] : [...ids, moved];
    await reorderTracks(playlistId, reordered);
  };

  return (
    <ScrollView style={styles.container}>
      {!playlist && isLoading ? (
        <Text style={styles.muted}>Loading playlist…</Text>
      ) : null}
      {playlist ? (
        <>
          <View style={styles.headerBlock}>
            <Text variant="headlineSmall" style={styles.title}>
              {playlist.name}
            </Text>
            {playlist.description ? (
              <Text variant="bodyMedium" style={styles.description}>
                {playlist.description}
              </Text>
            ) : null}
            <Button mode="contained" icon="play" onPress={handlePlayAll} disabled={tracks.length === 0}>
              Play All
            </Button>
          </View>
          {tracks.length === 0 ? (
            <Text style={styles.muted}>This playlist is empty.</Text>
          ) : (
            tracks.map((track) => {
              const trackKey = `${track.id}-${track.position}`;
              return (
                <List.Item
                  key={trackKey}
                  title={track.title}
                  description={`${track.artist} • ${track.album}`}
                  left={(props) => (
                    <Text {...props} style={styles.indexLabel}>
                      {track.position + 1}
                    </Text>
                  )}
                  right={() => (
                    <Menu
                      visible={menuTrackId === trackKey}
                      onDismiss={() => setMenuTrackId(null)}
                      anchor={(
                        <IconButton
                          icon="dots-vertical"
                          iconColor="#888"
                          onPress={() => setMenuTrackId(trackKey)}
                          accessibilityLabel="Track options"
                        />
                      )}
                    >
                      <Menu.Item
                        title="Remove from playlist"
                        leadingIcon="playlist-remove"
                        onPress={() => {
                          setMenuTrackId(null);
                          removeTrack(playlistId, track.id).catch(() => {});
                        }}
                      />
                      <Menu.Item
                        title="Move to top"
                        leadingIcon="arrow-up-bold"
                        onPress={() => {
                          setMenuTrackId(null);
                          handleMoveTrack(track.position, 'top').catch(() => {});
                        }}
                      />
                      <Menu.Item
                        title="Move to bottom"
                        leadingIcon="arrow-down-bold"
                        onPress={() => {
                          setMenuTrackId(null);
                          handleMoveTrack(track.position, 'bottom').catch(() => {});
                        }}
                      />
                    </Menu>
                  )}
                  style={styles.trackItem}
                />
              );
            })
          )}
        </>
      ) : null}
      {!isLoading && error ? <Text style={styles.errorText}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  headerBlock: {
    padding: 16,
    gap: 8,
  },
  title: {
    color: '#fff',
  },
  description: {
    color: '#888',
  },
  trackItem: {
    backgroundColor: '#1a1a1a',
  },
  indexLabel: {
    alignSelf: 'center',
    width: 28,
    textAlign: 'center',
    color: '#888',
  },
  muted: {
    color: '#888',
    padding: 24,
  },
  errorText: {
    color: '#f87171',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
