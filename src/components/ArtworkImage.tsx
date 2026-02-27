/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState, useRef, useEffect } from 'react';
import { Image, View, Text, StyleSheet, Platform } from 'react-native';
import { Icon } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';

interface Props {
  type: 'album';
  id: number;
  size?: number;
  style?: object;
  borderRadius?: number;
  /** When true, delay loading the image until it is near the viewport (web: IntersectionObserver). */
  defer?: boolean;
}

export default function ArtworkImage({ type, id, size = 64, style, borderRadius, defer }: Props) {
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(!defer);
  const containerRef = useRef<View>(null);

  useEffect(() => {
    if (!defer || visible) return;
    if (Platform.OS !== 'web') {
      setVisible(true);
      return;
    }
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== 'function') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [defer, visible]);

  const token = useAuthStore((s) => s.token);
  let uri = api.getArtworkUrl(type, id);
  if (token) uri += (uri.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token);
  // #region agent log
  const uriInvalid = !uri || typeof uri !== 'string' || uri.includes('undefined');
  if (Platform.OS !== 'web' && visible && !failed && uriInvalid) {
    try {
      console.log('[DEBUG]', JSON.stringify({ hypothesisId: 'E', location: 'ArtworkImage.tsx', message: 'Invalid URI, using placeholder', data: { id }, timestamp: Date.now() }));
    } catch (_) {}
  }
  // #endregion

  const radius = borderRadius ?? size / 8;
  const boxStyle = { width: size, height: size, borderRadius: radius };

  if (!visible) {
    if (Platform.OS === 'web') {
      return (
        <div
          ref={containerRef as React.RefObject<HTMLDivElement>}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: '#333',
            overflow: 'hidden',
          }}
        />
      );
    }
    return (
      <View ref={containerRef} collapsable={false} style={[styles.placeholder, boxStyle, style]} />
    );
  }

  if (failed) {
    return (
      <View style={[styles.placeholder, boxStyle, style]}>
        <Icon source="music" size={size * 0.5} color="#666" />
      </View>
    );
  }

  // Guard: invalid URI can crash native Image on Android
  if (Platform.OS !== 'web' && uriInvalid) {
    return (
      <View style={[styles.placeholder, boxStyle, style]}>
        <Icon source="music" size={size * 0.5} color="#666" />
      </View>
    );
  }

  // On web, use native <img> to avoid React Native Web Image quirks that can block loading
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.placeholder, boxStyle, style]}>
        <img
          src={uri}
          alt=""
          width={size}
          height={size}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            objectFit: 'cover',
            display: 'block',
          }}
          onError={() => setFailed(true)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.placeholder, boxStyle, style]}>
      <Image
        source={{ uri }}
        style={boxStyle}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

/** Placeholder when no album art - dark box with subtle "no album art" label */
export function ArtworkPlaceholder({ size = 64, style }: { size?: number; style?: object }) {
  const radius = size / 8;
  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: radius, justifyContent: 'center', alignItems: 'center' },
        style,
      ]}
    >
      <Text style={[styles.noArtLabel, { fontSize: Math.max(10, Math.min(12, size * 0.12)) }]} numberOfLines={2}>
        no album art
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#333',
    overflow: 'hidden',
  },
  noArtLabel: {
    color: '#555',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
});
