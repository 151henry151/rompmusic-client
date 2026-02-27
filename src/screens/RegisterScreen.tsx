/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, isLoading } = useAuthStore();
  const navigation = useNavigation();

  const handleRegister = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }
    try {
      await register(username.trim(), email.trim(), password);
      navigation.navigate('VerifyEmail' as never, { email: email.trim() } as never);
    } catch (e) {
      Alert.alert('Registration failed', e instanceof Error ? e.message : 'Could not create account');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.box}>
        <Text variant="headlineMedium" style={styles.title}>
          Create account
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Sign up for RompMusic
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
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
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
          onPress={handleRegister}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
        >
          Create account
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          disabled={isLoading}
          style={styles.backButton}
        >
          Already have an account? Sign in
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
  backButton: {
    marginTop: 16,
  },
});
