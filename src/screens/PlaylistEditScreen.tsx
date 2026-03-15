/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, IconButton, List, Text, TextInput } from 'react-native-paper';
import type { AppStackParamList } from '../navigation/types';
import { usePlaylistStore } from '../store/playlistStore';
import type { PlaylistTrackOut } from '../services/playlistService';

export default function PlaylistEditScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'PlaylistEdit'>>();
  const route = useRoute<RouteProp<AppStackParamList, 'PlaylistEdit'>>();
  const { playlistId } = route.params;
  const fetchPlaylist = usePlaylistStore((state) => state.fetchPlaylist);
  const updatePlaylist = usePlaylistStore((state) => state.updatePlaylist);
  const reorderTracks = usePlaylistStore((state) => state.reorderTracks);
  const currentPlaylist = usePlaylistStore((state) => state.currentPlaylist);
  const isLoading = usePlaylistStore((state) => state.isLoading);
  const playlist = currentPlaylist && currentPlaylist.id === playlistId ? currentPlaylist : null;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState<number[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchPlaylist(playlistId).catch(() => {});
    }, [fetchPlaylist, playlistId])
  );

  useEffect(() => {
    if (!playlist) return;
    setName(playlist.name);
    setDescription(playlist.description || '');
    setOrder(playlist.tracks.map((track) => track.id));
  }, [playlist?.id, playlist?.name, playlist?.description, playlist?.tracks]);

  const tracksById = useMemo(() => {
    const map = new Map<number, PlaylistTrackOut>();
    (playlist?.tracks || []).forEach((track) => {
      map.set(track.id, track);
    });
    return map;
  }, [playlist?.tracks]);

  const orderedTracks = useMemo(
    () => order.map((id) => tracksById.get(id)).filter(Boolean) as PlaylistTrackOut[],
    [order, tracksById]
  );

  const moveTrack = (index: number, direction: 'up' | 'down') => {
    const next = [...order];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= next.length) return;
    const temp = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = temp;
    setOrder(next);
  };

  const handleSave = async () => {
    await updatePlaylist(playlistId, {
      name: name.trim(),
      description: description.trim() || null,
    });
    if (order.length > 0) {
      await reorderTracks(playlistId, order);
    }
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      {!playlist ? <Text style={styles.muted}>Loading playlist…</Text> : null}
      {playlist ? (
        <>
          <View style={styles.formWrap}>
            <TextInput
              mode="outlined"
              label="Name"
              value={name}
              onChangeText={setName}
              style={styles.input}
              outlineColor="#333"
              activeOutlineColor="#4a9eff"
              textColor="#fff"
            />
            <TextInput
              mode="outlined"
              label="Description (optional)"
              value={description}
              onChangeText={setDescription}
              style={styles.input}
              outlineColor="#333"
              activeOutlineColor="#4a9eff"
              textColor="#fff"
            />
            <Button mode="contained" onPress={handleSave} loading={isLoading} disabled={isLoading || !name.trim()}>
              Save
            </Button>
          </View>
          <Text variant="titleSmall" style={styles.section}>
            Reorder tracks
          </Text>
          {orderedTracks.map((track, index) => (
            <List.Item
              key={`${track.id}-${index}`}
              title={track.title}
              description={`${track.artist} • ${track.album}`}
              right={() => (
                <View style={styles.reorderActions}>
                  <IconButton
                    icon="arrow-up"
                    iconColor="#fff"
                    onPress={() => moveTrack(index, 'up')}
                    disabled={index === 0}
                    accessibilityLabel="Move track up"
                  />
                  <IconButton
                    icon="arrow-down"
                    iconColor="#fff"
                    onPress={() => moveTrack(index, 'down')}
                    disabled={index === orderedTracks.length - 1}
                    accessibilityLabel="Move track down"
                  />
                </View>
              )}
              style={styles.trackItem}
            />
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  formWrap: {
    padding: 16,
    gap: 10,
  },
  input: {
    backgroundColor: '#1a1a1a',
  },
  section: {
    color: '#888',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  trackItem: {
    backgroundColor: '#1a1a1a',
  },
  reorderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  muted: {
    color: '#888',
    padding: 24,
  },
});
