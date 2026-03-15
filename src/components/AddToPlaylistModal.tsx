/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { usePlaylistStore } from '../store/playlistStore';

interface AddToPlaylistModalProps {
  visible: boolean;
  trackId: number | null;
  onDismiss: () => void;
  onAdded?: (playlistName: string) => void;
}

export default function AddToPlaylistModal({
  visible,
  trackId,
  onDismiss,
  onAdded,
}: AddToPlaylistModalProps) {
  const playlists = usePlaylistStore((state) => state.playlists);
  const isLoading = usePlaylistStore((state) => state.isLoading);
  const fetchPlaylists = usePlaylistStore((state) => state.fetchPlaylists);
  const createPlaylist = usePlaylistStore((state) => state.createPlaylist);
  const addTrack = usePlaylistStore((state) => state.addTrack);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!visible) {
      setShowCreate(false);
      setName('');
      setDescription('');
      return;
    }
    fetchPlaylists().catch(() => {});
  }, [visible, fetchPlaylists]);

  const handleAdd = async (playlistId: number, playlistName: string) => {
    if (!trackId) return;
    await addTrack(playlistId, trackId);
    onAdded?.(playlistName);
    onDismiss();
  };

  const handleCreateAndAdd = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const created = await createPlaylist({
      name: trimmedName,
      description: description.trim() || null,
    });
    if (trackId) {
      await addTrack(created.id, trackId);
      onAdded?.(created.name);
    }
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>{showCreate ? 'Create playlist' : 'Add to playlist'}</Dialog.Title>
        <Dialog.Content>
          {showCreate ? (
            <>
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
            </>
          ) : (
            <>
              {playlists.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>No playlists yet.</Text>
                  <Button mode="outlined" onPress={() => setShowCreate(true)}>
                    Create new playlist
                  </Button>
                </View>
              ) : (
                <View style={styles.listWrap}>
                  {playlists.map((playlist) => (
                    <Button
                      key={playlist.id}
                      mode="text"
                      style={styles.playlistButton}
                      onPress={() => handleAdd(playlist.id, playlist.name)}
                      disabled={isLoading}
                    >
                      {playlist.name} ({playlist.track_count})
                    </Button>
                  ))}
                  <Button mode="outlined" onPress={() => setShowCreate(true)}>
                    Create new playlist
                  </Button>
                </View>
              )}
            </>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          {showCreate ? (
            <>
              <Button onPress={() => setShowCreate(false)} disabled={isLoading}>
                Back
              </Button>
              <Button onPress={handleCreateAndAdd} loading={isLoading} disabled={isLoading}>
                Save
              </Button>
            </>
          ) : (
            <Button onPress={onDismiss}>Close</Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    backgroundColor: '#1a1a1a',
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#1a1a1a',
  },
  emptyWrap: {
    gap: 12,
  },
  emptyText: {
    color: '#888',
  },
  listWrap: {
    gap: 8,
  },
  playlistButton: {
    justifyContent: 'flex-start',
  },
});
