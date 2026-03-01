/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import {
  Modal,
  NativeSyntheticEvent,
  NativeTouchEvent,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import ArtworkImage from './ArtworkImage';

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const DEFAULT_ARTWORK_COVERAGE = 0.82;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getPinchDistance(event: NativeSyntheticEvent<NativeTouchEvent>): number | null {
  const touches = event.nativeEvent.touches as unknown as Array<{ pageX: number; pageY: number }>;
  if (!Array.isArray(touches) || touches.length < 2) return null;
  const [first, second] = touches;
  return Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY);
}

interface Props {
  visible: boolean;
  albumId: number;
  onClose: () => void;
  title?: string;
}

export default function ZoomableArtworkModal({ visible, albumId, onClose, title }: Props) {
  const { width, height } = useWindowDimensions();
  const [zoom, setZoom] = React.useState(MIN_ZOOM);
  const pinchStartDistanceRef = React.useRef<number | null>(null);
  const pinchStartZoomRef = React.useRef(MIN_ZOOM);

  React.useEffect(() => {
    if (!visible) return;
    setZoom(MIN_ZOOM);
    pinchStartDistanceRef.current = null;
    pinchStartZoomRef.current = MIN_ZOOM;
  }, [visible, albumId]);

  const artworkSize = Math.max(220, Math.min(width, height) * DEFAULT_ARTWORK_COVERAGE);

  const handleTouchStart = React.useCallback((event: NativeSyntheticEvent<NativeTouchEvent>) => {
    const distance = getPinchDistance(event);
    if (!distance) return;
    pinchStartDistanceRef.current = distance;
    pinchStartZoomRef.current = zoom;
  }, [zoom]);

  const handleTouchMove = React.useCallback((event: NativeSyntheticEvent<NativeTouchEvent>) => {
    const distance = getPinchDistance(event);
    if (!distance) return;
    const startDistance = pinchStartDistanceRef.current;
    if (!startDistance || startDistance <= 0) {
      pinchStartDistanceRef.current = distance;
      pinchStartZoomRef.current = zoom;
      return;
    }
    const nextZoom = clamp(pinchStartZoomRef.current * (distance / startDistance), MIN_ZOOM, MAX_ZOOM);
    setZoom(nextZoom);
  }, [zoom]);

  const handleTouchEnd = React.useCallback((event: NativeSyntheticEvent<NativeTouchEvent>) => {
    const touches = event.nativeEvent.touches as unknown as Array<unknown>;
    if (!Array.isArray(touches) || touches.length < 2) {
      pinchStartDistanceRef.current = null;
      pinchStartZoomRef.current = zoom;
    }
  }, [zoom]);

  const handleResetZoom = React.useCallback(() => {
    setZoom(MIN_ZOOM);
    pinchStartDistanceRef.current = null;
    pinchStartZoomRef.current = MIN_ZOOM;
  }, []);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close zoomed artwork"
        />
        <View style={styles.closeButtonWrap}>
          <IconButton icon="close" size={28} onPress={onClose} iconColor="#fff" accessibilityLabel="Close zoomed artwork" />
        </View>
        <View style={styles.centerWrap}>
          <View
            style={[styles.zoomSurface, { width: artworkSize, height: artworkSize }]}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <View style={[styles.zoomedArtwork, { transform: [{ scale: zoom }] }]}>
              <ArtworkImage type="album" id={albumId} size={artworkSize} borderRadius={14} />
            </View>
          </View>
          <Text style={styles.hintText} variant="bodySmall">
            {title ? `${title} • ` : ''}Pinch to zoom
          </Text>
          {zoom > MIN_ZOOM + 0.02 && (
            <Pressable style={styles.resetZoomButton} onPress={handleResetZoom} accessibilityRole="button" accessibilityLabel="Reset artwork zoom">
              <Text style={styles.resetZoomText}>Reset zoom</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  closeButtonWrap: {
    position: 'absolute',
    top: 16,
    right: 12,
    zIndex: 2,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  zoomSurface: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  zoomedArtwork: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    color: '#bbb',
    marginTop: 14,
    textAlign: 'center',
  },
  resetZoomButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#4a9eff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(30, 43, 63, 0.7)',
  },
  resetZoomText: {
    color: '#9ec7ff',
    fontSize: 12,
    fontWeight: '600',
  },
});
