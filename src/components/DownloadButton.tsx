/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Download button for tracks/albums - shows download status and triggers offline download.
 * Only functional on native (iOS/Android); hidden on web.
 */

import React from 'react';
import { Platform, View, ActivityIndicator, StyleSheet } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useOfflineStore } from '../store/offlineStore';
import type { OfflineTrack } from '../store/offlineStore';

interface TrackDownloadProps {
  track: OfflineTrack;
  size?: number;
}

/** Download button for a single track. */
export function TrackDownloadButton({ track, size = 24 }: TrackDownloadProps) {
  if (Platform.OS === 'web') return null;

  const isDownloaded = useOfflineStore((s) => !!s.downloadedTracks[track.id]?.localAudioUri);
  const activeDownload = useOfflineStore((s) => s.activeDownloads[track.id]);
  const downloadTrack = useOfflineStore((s) => s.downloadTrack);
  const removeDownload = useOfflineStore((s) => s.removeDownload);

  const isDownloading = activeDownload?.status === 'downloading';

  if (isDownloading) {
    return (
      <View style={styles.spinnerWrap}>
        <ActivityIndicator size="small" color="#4a9eff" />
      </View>
    );
  }

  if (isDownloaded) {
    return (
      <IconButton
        icon="check-circle"
        size={size}
        iconColor="#4ade80"
        onPress={() => removeDownload(track.id)}
        accessibilityLabel={`Remove ${track.title} from offline library`}
      />
    );
  }

  return (
    <IconButton
      icon="download"
      size={size}
      iconColor="#888"
      onPress={() => downloadTrack(track)}
      accessibilityLabel={`Download ${track.title} for offline playback`}
    />
  );
}

interface AlbumDownloadProps {
  albumId: number;
  compact?: boolean;
}

/** Download button for an entire album. */
export function AlbumDownloadButton({ albumId, compact }: AlbumDownloadProps) {
  if (Platform.OS === 'web') return null;

  const downloadAlbum = useOfflineStore((s) => s.downloadAlbum);
  const activeDownloads = useOfflineStore((s) => s.activeDownloads);
  const downloadedTracks = useOfflineStore((s) => s.downloadedTracks);

  const albumTrackIds = Object.values(downloadedTracks)
    .filter((t) => t.album_id === albumId)
    .map((t) => t.id);

  const isAnyDownloading = Object.values(activeDownloads).some(
    (d) => d.status === 'downloading'
  );

  if (isAnyDownloading) {
    return (
      <View style={styles.spinnerWrap}>
        <ActivityIndicator size="small" color="#4a9eff" />
      </View>
    );
  }

  if (albumTrackIds.length > 0) {
    return (
      <IconButton
        icon="check-circle"
        size={compact ? 20 : 24}
        iconColor="#4ade80"
        onPress={() => downloadAlbum(albumId)}
        accessibilityLabel="Download remaining album tracks"
      />
    );
  }

  return (
    <IconButton
      icon="download"
      size={compact ? 20 : 24}
      iconColor="#888"
      onPress={() => downloadAlbum(albumId)}
      accessibilityLabel="Download album for offline playback"
    />
  );
}

const styles = StyleSheet.create({
  spinnerWrap: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
