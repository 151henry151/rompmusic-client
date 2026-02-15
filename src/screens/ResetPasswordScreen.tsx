/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';

type ResetParams = { email: string };
type NavParams = { ResetPassword: ResetParams };

export default function ResetPasswordScreen() {
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const { resetPassword, isLoading } = useAuthStore();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<NavParams, 'ResetPassword'>>();
  const email = route.params?.email || '';

  const handleSubmit = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter the reset code');
      return;
    }
    if (!newPassword) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }
    try {
      await resetPassword(email, code.trim(), newPassword);
      Alert.alert('Success', 'Password reset. You can now sign in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login' as never) },
      ]);
    } catch (e) {
      Alert.alert('Reset failed', e instanceof Error ? e.message : 'Invalid code or code expired');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.box}>
        <Text variant="headlineMedium" style={styles.title}>
          Reset password
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Enter the 6-digit code from your email and your new password.
        </Text>
        <TextInput
          label="Reset code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.input}
          disabled={isLoading}
        />
        <TextInput
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          style={styles.input}
          disabled={isLoading}
        />
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading || code.length !== 6 || !newPassword}
          style={styles.button}
        >
          Reset password
        </Button>
        <Button mode="text" onPress={() => navigation.goBack()} disabled={isLoading}>
          Back
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
