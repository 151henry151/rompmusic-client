import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';

type VerifyParams = { email: string };

export default function VerifyEmailScreen() {
  const [code, setCode] = useState('');
  const { verifyEmail, isLoading, clearPendingVerify } = useAuthStore();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ VerifyEmail: VerifyParams }, 'VerifyEmail'>>();
  const email = route.params?.email || '';

  const handleVerify = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }
    try {
      await verifyEmail(email, code.trim());
      Alert.alert('Success', 'Email verified. You can now sign in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login' as never) },
      ]);
    } catch (e) {
      Alert.alert('Verification failed', e instanceof Error ? e.message : 'Invalid code');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.box}>
        <Text variant="headlineMedium" style={styles.title}>Verify your email</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          We sent a 6-digit code to {email}. Enter it below.
        </Text>
        <TextInput
          label="Verification code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.input}
          disabled={isLoading}
        />
        <Button
          mode="contained"
          onPress={handleVerify}
          loading={isLoading}
          disabled={isLoading || code.length !== 6}
          style={styles.button}
        >
          Verify
        </Button>
        <Button mode="text" onPress={() => { clearPendingVerify(); navigation.goBack(); }} disabled={isLoading}>
          Back
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0a0a0a' },
  box: { width: '100%', maxWidth: 380, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 24 },
  title: { textAlign: 'center', marginBottom: 8, color: '#fff' },
  subtitle: { textAlign: 'center', marginBottom: 24, color: '#888' },
  input: { marginBottom: 16, backgroundColor: '#222' },
  button: { marginBottom: 12 },
});
