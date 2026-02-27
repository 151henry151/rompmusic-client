/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * First-run server configuration. Shown when native app has no saved server URL,
 * or when web has neither a saved URL nor EXPO_PUBLIC_API_URL preconfiguration.
 */

import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { useServerStore, normalizeServerUrl, isInsecureRemoteHttpUrl } from '../store/serverStore';

export default function ServerSetupScreen() {
  const setServerUrl = useServerStore((s) => s.setServerUrl);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const normalized = normalizeServerUrl(input);
    if (!normalized) {
      setError('Please enter your server URL (e.g. https://music.example.com)');
      return;
    }
    if (Platform.OS === 'ios' && isInsecureRemoteHttpUrl(normalized)) {
      setError('iOS requires https:// for remote servers. Use https://your-server.example.com');
      return;
    }
    try {
      setError(null);
      setSaving(true);
      await setServerUrl(normalized);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text variant="headlineSmall" style={styles.title}>
          Connect to your server
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          Enter the URL of your RompMusic server. You can use the same server address you use in a browser (e.g. https://music.example.com). The app will use the API at /api/v1.
        </Text>
        <TextInput
          mode="outlined"
          label="Server URL"
          placeholder="https://music.example.com"
          value={input}
          onChangeText={(t) => { setInput(t); setError(null); }}
          onSubmitEditing={handleSubmit}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.input}
          outlineColor="#333"
          activeOutlineColor="#4a9eff"
          textColor="#fff"
          disabled={saving}
          accessibilityLabel="Server URL"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={saving}
          disabled={saving}
          style={styles.button}
        >
          Continue
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    color: '#fff',
    marginBottom: 12,
  },
  paragraph: {
    color: '#888',
    marginBottom: 20,
  },
  input: {
    marginBottom: 8,
  },
  error: {
    color: '#f87171',
    marginBottom: 12,
    fontSize: 14,
  },
  button: {
    marginTop: 8,
  },
});
