/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState } from 'react';
import { Image, View, StyleSheet, Platform } from 'react-native';
import { Icon } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';

interface Props {
  type: 'album';
  id: number;
  size?: number;
  style?: object;
  borderRadius?: number;
}

export default function ArtworkImage({ type, id, size = 64, style, borderRadius }: Props) {
  const [failed, setFailed] = useState(false);
  const token = useAuthStore((s) => s.token);
  let uri = api.getArtworkUrl(type, id);
  if (token) uri += (uri.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token);

  const radius = borderRadius ?? size / 8;
  const boxStyle = { width: size, height: size, borderRadius: radius };

  if (failed) {
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

/** Placeholder when artwork fails to load - dark box with music icon area */
export function ArtworkPlaceholder({ size = 64, style }: { size?: number; style?: object }) {
  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: size / 8 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#333',
    overflow: 'hidden',
  },
});
