/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const { forgotPassword, isLoading } = useAuthStore();
  const navigation = useNavigation();

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    try {
      await forgotPassword(email.trim());
      Alert.alert('Check your email', 'If an account exists, you will receive a password reset code.', [
        { text: 'OK', onPress: () => navigation.navigate('ResetPassword' as never, { email: email.trim() }) },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.box}>
        <Text variant="headlineMedium" style={styles.title}>
          Forgot password
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Enter your email and we will send you a reset code.
        </Text>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          disabled={isLoading}
        />
        <Button mode="contained" onPress={handleSubmit} loading={isLoading} disabled={isLoading} style={styles.button}>
          Send reset code
        </Button>
        <Button mode="text" onPress={() => navigation.goBack()} disabled={isLoading}>
          Back to sign in
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

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
    maxWidth: 380,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 24,
  },
  title: { textAlign: 'center', marginBottom: 8, color: '#fff' },
  subtitle: { textAlign: 'center', marginBottom: 24, color: '#888' },
  input: { marginBottom: 16, backgroundColor: '#222' },
  button: { marginBottom: 12 },
});
