/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Platform } from 'react-native';
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setToken } from '../api/client';

interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isReady: boolean;
  pendingVerifyEmail: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearPendingVerify: () => void;
}

const TOKEN_KEY = 'rompmusic_token';
const useSecureStore = Platform.OS !== 'web';

async function getStoredToken(): Promise<string | null> {
  if (useSecureStore) {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function setStoredToken(value: string | null): Promise<void> {
  if (useSecureStore) {
    if (value) await SecureStore.setItemAsync(TOKEN_KEY, value);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } else {
    if (value) await AsyncStorage.setItem(TOKEN_KEY, value);
    else await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isReady: false,
  pendingVerifyEmail: null,

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const token = await api.login(username, password);
      setToken(token);
      await setStoredToken(token);
      const user = await api.getMe();
      set({ user, token, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  register: async (username, email, password) => {
    set({ isLoading: true });
    try {
      await api.register(username, email, password);
      set({ pendingVerifyEmail: email, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  verifyEmail: async (email, code) => {
    set({ isLoading: true });
    try {
      await api.verifyEmail(email, code);
      set({ pendingVerifyEmail: null, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  forgotPassword: async (email) => {
    set({ isLoading: true });
    try {
      await api.forgotPassword(email);
      set({ isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  resetPassword: async (email, code, newPassword) => {
    set({ isLoading: true });
    try {
      await api.resetPassword(email, code, newPassword);
      set({ isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  clearPendingVerify: () => set({ pendingVerifyEmail: null }),

  logout: async () => {
    setToken(null);
    await setStoredToken(null);
    set({ user: null, token: null });
  },

  restoreSession: async () => {
    try {
      const token = await getStoredToken();
      if (token) {
        setToken(token);
        const user = await api.getMe();
        set({ user, token, isReady: true });
      } else {
        set({ isReady: true });
      }
    } catch {
      await setStoredToken(null);
      set({ user: null, token: null, isReady: true });
    }
  },
}));
