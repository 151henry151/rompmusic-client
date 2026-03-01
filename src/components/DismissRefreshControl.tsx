/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { RefreshControl } from 'react-native';

/**
 * RefreshControl used for "swipe down to dismiss" — same pull gesture as refresh,
 * but no spinner/icon so it's not confused with pull-to-reload.
 */
export default function DismissRefreshControl({ onRefresh }: { onRefresh: () => void }) {
  return (
    <RefreshControl
      refreshing={false}
      onRefresh={onRefresh}
      tintColor="transparent"
      colors={['transparent']}
      progressBackgroundColor="transparent"
    />
  );
}
