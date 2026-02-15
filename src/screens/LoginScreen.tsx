/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState, useRef } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const passwordRef = useRef<any>(null);
  const { login, isLoading } = useAuthStore();
  const navigation = useNavigation();

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
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextInput
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          disabled={isLoading}
          returnKeyType="go"
          onSubmitEditing={handleLogin}
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
        <Button
          mode="text"
          onPress={() => navigation.navigate('ForgotPassword')}
          disabled={isLoading}
          style={styles.forgotButton}
        >
          Forgot password
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.navigate('Register')}
          disabled={isLoading}
          style={styles.registerButton}
        >
          Create account
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const FORM_MAX_WIDTH = 380;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0a0a0a',
  },
  box: {
    width: '100%',
    maxWidth: FORM_MAX_WIDTH,
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
  forgotButton: {
    marginTop: 8,
  },
  registerButton: {
    marginTop: 16,
  },
});
