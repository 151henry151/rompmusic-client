/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Hook and global state for network connectivity detection.
 * Uses a lightweight polling approach that works on all platforms.
 */

import { useEffect, useState } from 'react';
import { Platform, AppState } from 'react-native';
import { create } from 'zustand';

interface NetworkState {
  isOnline: boolean;
  setOnline: (v: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  setOnline: (v) => set({ isOnline: v }),
}));

/** Probe the server to determine connectivity. Lightweight HEAD or GET to health endpoint. */
async function probeConnectivity(): Promise<boolean> {
  try {
    const { useServerStore } = require('../store/serverStore');
    const base = useServerStore.getState().getApiBase();
    if (!base) return false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${base}/health`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'omit',
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

let probeInterval: ReturnType<typeof setInterval> | null = null;

/** Start periodic connectivity probing. Call once at app startup. */
export function startNetworkMonitoring(): void {
  const check = async () => {
    const online = await probeConnectivity();
    useNetworkStore.getState().setOnline(online);
  };

  // Initial check
  void check();

  // Re-check when app becomes active
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') void check();
  });

  // Periodic check every 15s
  if (probeInterval) clearInterval(probeInterval);
  probeInterval = setInterval(check, 15000);
}

/** React hook returning current online status. */
export function useIsOnline(): boolean {
  return useNetworkStore((s) => s.isOnline);
}
