/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, List, Button, Switch, Menu } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const restoreSettings = useSettingsStore((s) => s.restoreSettings);
  const groupArtistsByCapitalization = useSettingsStore((s) => s.groupArtistsByCapitalization);
  const setGroupArtistsByCapitalization = useSettingsStore((s) => s.setGroupArtistsByCapitalization);
  const displayAlbumsWithoutArtwork = useSettingsStore((s) => s.displayAlbumsWithoutArtwork);
  const setDisplayAlbumsWithoutArtwork = useSettingsStore((s) => s.setDisplayAlbumsWithoutArtwork);
  const displayArtistsWithoutArtwork = useSettingsStore((s) => s.displayArtistsWithoutArtwork);
  const setDisplayArtistsWithoutArtwork = useSettingsStore((s) => s.setDisplayArtistsWithoutArtwork);
  const groupCollaborationsByPrimary = useSettingsStore((s) => s.groupCollaborationsByPrimary);
  const setGroupCollaborationsByPrimary = useSettingsStore((s) => s.setGroupCollaborationsByPrimary);
  const streamFormat = useSettingsStore((s) => s.getEffectiveStreamFormat());
  const setStreamFormat = useSettingsStore((s) => s.setStreamFormat);
  const isSettingVisible = useSettingsStore((s) => s.isSettingVisible);
  const [audioMenuVisible, setAudioMenuVisible] = useState(false);

  useEffect(() => {
    restoreSettings();
  }, [restoreSettings]);

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineSmall" style={styles.header}>
        Settings
      </Text>

      <Text variant="titleSmall" style={styles.section}>
        Library
      </Text>
      {isSettingVisible('group_artists_by_capitalization') && (
        <List.Item
          title="Group artists with different capitalization"
          description="Merge artists that differ only by case (e.g. 100 Gecs and 100 gecs) into one entry. Default: on."
          left={() => <List.Icon icon="format-letter-case" />}
          right={() => (
            <Switch
              value={groupArtistsByCapitalization}
              onValueChange={setGroupArtistsByCapitalization}
              color="#4a9eff"
            />
          )}
          style={styles.item}
        />
      )}
      {isSettingVisible('display_albums_without_artwork') && (
        <List.Item
          title="Display albums without artwork"
          description="When off (default), albums with no cover art are hidden. Search always shows all."
          left={() => <List.Icon icon="album" />}
          right={() => (
            <Switch
              value={displayAlbumsWithoutArtwork}
              onValueChange={setDisplayAlbumsWithoutArtwork}
              color="#4a9eff"
            />
          )}
          style={styles.item}
        />
      )}
      {isSettingVisible('display_artists_without_artwork') && (
        <List.Item
          title="Display artists without artwork"
          description="When off (default), artists with no picture are hidden. Search always shows all."
          left={() => <List.Icon icon="account" />}
          right={() => (
            <Switch
              value={displayArtistsWithoutArtwork}
              onValueChange={setDisplayArtistsWithoutArtwork}
              color="#4a9eff"
            />
          )}
          style={styles.item}
        />
      )}
      {isSettingVisible('group_collaborations_by_primary') && (
        <List.Item
          title="Group collaborations by primary artist"
          description="When on, multi-artist entries (e.g. The Movement, Elliot Martin) are grouped under the primary artist (The Movement)."
          left={() => <List.Icon icon="account-group" />}
          right={() => (
            <Switch
              value={groupCollaborationsByPrimary}
              onValueChange={setGroupCollaborationsByPrimary}
              color="#4a9eff"
            />
          )}
          style={styles.item}
        />
      )}

      <Text variant="titleSmall" style={styles.section}>
        Account
      </Text>
      <List.Item
        title="Profile"
        description={user ? user.username : 'Not logged in'}
        left={() => <List.Icon icon="account" />}
        style={styles.item}
      />
      <List.Item
        title="Account"
        description="Manage your account"
        left={() => <List.Icon icon="account-cog" />}
        style={styles.item}
      />

      <Text variant="titleSmall" style={styles.section}>
        Playback
      </Text>
      <List.Item
        title="Gapless playback"
        description="Seamless transition between tracks"
        left={() => <List.Icon icon="music" />}
        style={styles.item}
      />
      {isSettingVisible('audio_format') && (
        <Menu
          visible={audioMenuVisible}
          onDismiss={() => setAudioMenuVisible(false)}
          anchor={
            <List.Item
              title="Audio quality"
              description={streamFormat === 'ogg' ? 'Stream as OGG (transcoded)' : 'Stream at original quality'}
              left={() => <List.Icon icon="quality-high" />}
              onPress={() => setAudioMenuVisible(true)}
              right={(props) => <List.Icon {...props} icon="chevron-down" />}
              style={styles.item}
            />
          }
        >
          <Menu.Item onPress={() => { setStreamFormat('original'); setAudioMenuVisible(false); }} title="Original format" />
          <Menu.Item onPress={() => { setStreamFormat('ogg'); setAudioMenuVisible(false); }} title="OGG (transcoded)" />
        </Menu>
      )}

      <Text variant="titleSmall" style={styles.section}>
        About
      </Text>
      <List.Item
        title="About"
        description="RompMusic 0.1.0-beta.1"
        left={() => <List.Icon icon="information" />}
        style={styles.item}
      />
      <List.Item
        title="Privacy"
        description="Privacy policy and data usage"
        left={() => <List.Icon icon="shield-account" />}
        style={styles.item}
      />

      <Button mode="contained" onPress={logout} style={styles.logout}>
        Log out
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    padding: 16,
    color: '#fff',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    color: '#888',
  },
  item: {
    backgroundColor: '#1a1a1a',
  },
  logout: {
    margin: 16,
  },
});
