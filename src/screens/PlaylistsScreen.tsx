/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Dialog, List, Portal, Text, TextInput } from 'react-native-paper';
import type { AppStackParamList } from '../navigation/types';
import { usePlaylistStore } from '../store/playlistStore';

export default function PlaylistsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'Playlists'>>();
  const playlists = usePlaylistStore((state) => state.playlists);
  const isLoading = usePlaylistStore((state) => state.isLoading);
  const error = usePlaylistStore((state) => state.error);
  const fetchPlaylists = usePlaylistStore((state) => state.fetchPlaylists);
  const createPlaylist = usePlaylistStore((state) => state.createPlaylist);
  const clearPlaylistError = usePlaylistStore((state) => state.clearPlaylistError);
  const [createVisible, setCreateVisible] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchPlaylists().catch(() => {});
    }, [fetchPlaylists])
  );

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const created = await createPlaylist({
      name: trimmed,
      description: description.trim() || null,
    });
    setCreateVisible(false);
    setName('');
    setDescription('');
    navigation.navigate('PlaylistDetail', { playlistId: created.id });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text variant="headlineSmall" style={styles.header}>
          Playlists
        </Text>
        <Button mode="contained" compact onPress={() => setCreateVisible(true)}>
          New Playlist
        </Button>
      </View>
      <ScrollView style={styles.scroll}>
        {error ? (
          <View style={styles.messageWrap}>
            <Text style={styles.errorText}>{error}</Text>
            <Button onPress={clearPlaylistError}>Dismiss</Button>
          </View>
        ) : null}
        {!isLoading && playlists.length === 0 ? (
          <View style={styles.messageWrap}>
            <Text style={styles.muted}>No playlists yet. Create your first playlist.</Text>
          </View>
        ) : null}
        {playlists.map((playlist) => (
          <List.Item
            key={playlist.id}
            title={playlist.name}
            description={`${playlist.track_count} track${playlist.track_count === 1 ? '' : 's'}`}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('PlaylistDetail', { playlistId: playlist.id })}
            style={styles.item}
          />
        ))}
      </ScrollView>
      <Portal>
        <Dialog visible={createVisible} onDismiss={() => setCreateVisible(false)} style={styles.dialog}>
          <Dialog.Title>Create playlist</Dialog.Title>
          <Dialog.Content>
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
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreateVisible(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onPress={handleCreate} loading={isLoading} disabled={isLoading}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  header: {
    color: '#fff',
  },
  scroll: {
    flex: 1,
  },
  item: {
    backgroundColor: '#1a1a1a',
  },
  messageWrap: {
    padding: 24,
    gap: 8,
  },
  muted: {
    color: '#888',
  },
  errorText: {
    color: '#f87171',
  },
  dialog: {
    backgroundColor: '#1a1a1a',
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#1a1a1a',
  },
});
