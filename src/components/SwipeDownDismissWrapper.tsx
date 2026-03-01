/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Wraps screen content so that dragging down from the top drag-handle area
 * slides the whole screen down, revealing the previous screen underneath, then dismisses.
 */

import React, { useImperativeHandle, useRef, forwardRef } from 'react';
import { Animated, PanResponder, StyleSheet, useWindowDimensions, View } from 'react-native';

const DRAG_HANDLE_HEIGHT = 80;
const DISMISS_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 0.3;

export interface SwipeDownDismissWrapperRef {
  dismissWithAnimation: () => void;
}

interface Props {
  onDismiss: () => void;
  children: React.ReactNode;
  style?: object;
}

function SwipeDownDismissWrapperInner({ onDismiss, children, style }: Props, ref: React.Ref<SwipeDownDismissWrapperRef>) {
  const { height } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(0)).current;

  const runDismissAnimation = () => {
    Animated.timing(translateY, {
      toValue: height,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };
  const runDismissAnimationRef = useRef(runDismissAnimation);
  runDismissAnimationRef.current = runDismissAnimation;

  useImperativeHandle(ref, () => ({
    dismissWithAnimation: () => runDismissAnimationRef.current?.(),
  }), []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 8;
      },
      onPanResponderMove: (_, gestureState) => {
        const dy = gestureState.dy;
        if (dy > 0) {
          translateY.setValue(dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const dy = gestureState.dy;
        const vy = gestureState.vy;
        const shouldDismiss = dy > DISMISS_THRESHOLD || vy > VELOCITY_THRESHOLD;

        if (shouldDismiss) {
          runDismissAnimationRef.current?.();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={[styles.outer, style]} collapsable={false}>
      <Animated.View
        style={[styles.animatedFill, { transform: [{ translateY }] }]}
      >
        <View style={styles.content} collapsable={false}>
          {children}
        </View>
        <View
          style={[styles.dragHandle, { height: DRAG_HANDLE_HEIGHT }]}
          {...panResponder.panHandlers}
          pointerEvents="box-none"
        />
      </Animated.View>
    </View>
  );
}

const SwipeDownDismissWrapper = forwardRef<SwipeDownDismissWrapperRef, Props>(SwipeDownDismissWrapperInner);
export default SwipeDownDismissWrapper;

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  },
  animatedFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
  },
  dragHandle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
});
