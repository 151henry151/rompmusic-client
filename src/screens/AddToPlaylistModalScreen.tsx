/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import type { AppStackParamList } from '../navigation/types';

export default function AddToPlaylistModalScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'AddToPlaylistModal'>>();
  const route = useRoute<RouteProp<AppStackParamList, 'AddToPlaylistModal'>>();
  const { trackId } = route.params;

  return (
    <AddToPlaylistModal
      visible
      trackId={trackId}
      onDismiss={() => navigation.goBack()}
    />
  );
}
