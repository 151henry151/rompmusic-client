/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Linking, Platform } from 'react-native';
import { Text, List, Button, Switch, Menu, Dialog, Portal, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useServerStore, normalizeServerUrl, isInsecureRemoteHttpUrl } from '../store/serverStore';


export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const restoreSettings = useSettingsStore((s) => s.restoreSettings);
  const groupArtistsByCapitalization = useSettingsStore((s) => s.groupArtistsByCapitalization);
  const setGroupArtistsByCapitalization = useSettingsStore((s) => s.setGroupArtistsByCapitalization);
  const albumsArtworkFirst = useSettingsStore((s) => s.albumsArtworkFirst);
  const setAlbumsArtworkFirst = useSettingsStore((s) => s.setAlbumsArtworkFirst);
  const streamFormat = useSettingsStore((s) => s.getEffectiveStreamFormat());
  const setStreamFormat = useSettingsStore((s) => s.setStreamFormat);
  const isSettingVisible = useSettingsStore((s) => s.isSettingVisible);
  const [audioMenuVisible, setAudioMenuVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [serverDialogVisible, setServerDialogVisible] = useState(false);
  const [serverInput, setServerInput] = useState('');
  const [serverSaving, setServerSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const getDisplayServerUrl = useServerStore((s) => s.getDisplayServerUrl);
  const setServerUrl = useServerStore((s) => s.setServerUrl);
  const displayServerUrl = getDisplayServerUrl();

  const WEBSITE_BASE = process.env.EXPO_PUBLIC_WEBSITE_URL || 'https://rompmusic.com';

  useEffect(() => {
    restoreSettings();
  }, [restoreSettings]);

  const openServerDialog = () => {
    setServerInput(displayServerUrl || '');
    setServerError(null);
    setServerDialogVisible(true);
  };

  const saveServerUrl = async () => {
    const normalized = normalizeServerUrl(serverInput);
    if (!normalized) {
      setServerError('Please enter a valid server URL (e.g. https://music.example.com)');
      return;
    }
    if (Platform.OS === 'ios' && isInsecureRemoteHttpUrl(normalized)) {
      setServerError('iOS requires https:// for remote servers. Use https://your-server.example.com');
      return;
    }
    setServerSaving(true);
    setServerError(null);
    try {
      await setServerUrl(normalized);
      await logout();
      setServerDialogVisible(false);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setServerSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineSmall" style={styles.header}>
        Settings
      </Text>

      <Text variant="titleSmall" style={styles.section}>
        Server
      </Text>
      <List.Item
        title="Server URL"
        description={displayServerUrl ? displayServerUrl : "Using this build's default server"}
        left={() => <List.Icon icon="server" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={openServerDialog}
        style={styles.item}
        accessibilityRole="button"
        accessibilityLabel="Change server URL"
      />

      <Text variant="titleSmall" style={styles.section}>
        Library
      </Text>
      {isSettingVisible('group_artists_by_capitalization') && (
        <List.Item
          title="Group artists with different capitalization"
          description="Merge artists that differ only by case (e.g. John Coltrane and John coltrane) into one entry. Default: on."
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
      {isSettingVisible('albums_artwork_first') && (
        <List.Item
          title="Put albums with artwork first"
          description="Show albums that have cover art at the top; albums without art appear at the bottom. Default: on."
          left={() => <List.Icon icon="album" />}
          right={() => (
            <Switch
              value={albumsArtworkFirst}
              onValueChange={setAlbumsArtworkFirst}
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
        description={user ? (user.email ? `${user.username} • ${user.email}` : user.username) : 'Tap to sign in'}
        left={() => <List.Icon icon="account" />}
        onPress={!user ? () => navigation.navigate('Login') : undefined}
        right={!user ? (props) => <List.Icon {...props} icon="chevron-right" /> : undefined}
        style={styles.item}
        accessibilityRole="button"
      />
      <List.Item
        title="Change password"
        description="Request a reset code sent to your email"
        left={() => <List.Icon icon="account-cog" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => navigation.navigate('ForgotPassword', { fromSettings: true })}
        style={styles.item}
        accessibilityRole="button"
      />

      <Text variant="titleSmall" style={styles.section}>
        Playback
      </Text>
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
        description="RompMusic 0.1.0-beta.3"
        left={() => <List.Icon icon="information" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => setAboutVisible(true)}
        style={styles.item}
        accessibilityRole="button"
      />
      <List.Item
        title="Privacy Policy"
        description="View our full privacy policy"
        left={() => <List.Icon icon="shield-account" />}
        right={(props) => <List.Icon {...props} icon="open-in-new" />}
        onPress={() => Linking.openURL(`${WEBSITE_BASE}/privacy`)}
        style={styles.item}
        accessibilityRole="link"
      />
      <List.Item
        title="Terms of Service"
        description="View our terms of service"
        left={() => <List.Icon icon="file-document" />}
        right={(props) => <List.Icon {...props} icon="open-in-new" />}
        onPress={() => Linking.openURL(`${WEBSITE_BASE}/tos`)}
        style={styles.item}
        accessibilityRole="link"
      />

      <Portal>
        <Dialog visible={aboutVisible} onDismiss={() => setAboutVisible(false)} style={styles.dialog}>
          <Dialog.Title>About RompMusic</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              RompMusic 0.1.0-beta.3{'\n\n'}
              Libre music streaming. Free as in freedom.{'\n\n'}
              Licensed under GPL-3.0. Use, study, modify, and share. Self-hosted — your music stays on your server. No tracking, no ads.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAboutVisible(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={serverDialogVisible} onDismiss={() => !serverSaving && setServerDialogVisible(false)} style={styles.dialog}>
          <Dialog.Title>Server URL</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={styles.dialogText}>
              Enter your RompMusic server address (e.g. https://music.example.com). Changing the server will log you out.
            </Text>
            <TextInput
              mode="outlined"
              label="Server URL"
              placeholder="https://music.example.com"
              value={serverInput}
              onChangeText={(t) => { setServerInput(t); setServerError(null); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={styles.serverInput}
              outlineColor="#333"
              activeOutlineColor="#4a9eff"
              textColor="#fff"
              disabled={serverSaving}
            />
            {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => !serverSaving && setServerDialogVisible(false)} disabled={serverSaving}>Cancel</Button>
            <Button onPress={saveServerUrl} loading={serverSaving} disabled={serverSaving}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
  dialog: {
    backgroundColor: '#1a1a1a',
  },
  dialogText: {
    color: '#e0e0e0',
    lineHeight: 24,
  },
  serverInput: {
    marginTop: 12,
  },
  serverError: {
    color: '#f87171',
    marginTop: 8,
    fontSize: 14,
  },
});
