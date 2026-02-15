/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, ActivityIndicator } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }
    try {
      await login(username.trim(), password);
    } catch (e) {
      Alert.alert('Login failed', e instanceof Error ? e.message : 'Invalid credentials');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.box}>
        <Text variant="headlineMedium" style={styles.title}>
          RompMusic
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Libre music streaming
        </Text>
        <TextInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          disabled={isLoading}
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          disabled={isLoading}
        />
        <Button
          mode="contained"
          onPress={handleLogin}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
        >
          Sign in
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0a0a0a',
  },
  box: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
    color: '#fff',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#888',
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#222',
  },
  button: {
    marginTop: 8,
  },
});
