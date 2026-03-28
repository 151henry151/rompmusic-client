/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Offline storage service - downloads and manages audio files and artwork on the device.
 * Uses the new expo-file-system API (Paths, File, Directory classes).
 * Native only; web exports are no-ops.
 */

import { Platform } from 'react-native';
import { api, getToken } from '../api/client';

const AUDIO_SUBDIR = 'offline-audio';
const ARTWORK_SUBDIR = 'offline-artwork';
const METADATA_SUBDIR = 'offline-meta';

let FS: {
  Paths: typeof import('expo-file-system').Paths;
  File: typeof import('expo-file-system').File;
  Directory: typeof import('expo-file-system').Directory;
} | null = null;

if (Platform.OS !== 'web') {
  try {
    const mod = require('expo-file-system');
    FS = { Paths: mod.Paths, File: mod.File, Directory: mod.Directory };
  } catch {
    // expo-file-system not available
  }
}

function getDocDir() {
  return FS?.Paths.document ?? null;
}

function ensureSubDir(name: string): void {
  if (!FS) return;
  const doc = getDocDir();
  if (!doc) return;
  const dir = new FS.Directory(doc, name);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
}

export function getLocalAudioPath(trackId: number): string {
  if (!FS) return '';
  const doc = getDocDir();
  if (!doc) return '';
  return new FS.File(doc, AUDIO_SUBDIR, `track_${trackId}.audio`).uri;
}

export function getLocalArtworkPath(albumId: number): string {
  if (!FS) return '';
  const doc = getDocDir();
  if (!doc) return '';
  return new FS.File(doc, ARTWORK_SUBDIR, `album_${albumId}.img`).uri;
}

function getMetadataPath(key: string): string {
  if (!FS) return '';
  const doc = getDocDir();
  if (!doc) return '';
  return new FS.File(doc, METADATA_SUBDIR, `${key}.json`).uri;
}

function appendToken(url: string): string {
  const t = getToken();
  if (t) return url + (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(t);
  return url;
}

function getAuthHeaders(): Record<string, string> {
  const t = getToken();
  if (t) return { Authorization: `Bearer ${t}` };
  return {};
}

/** Download a track's audio file to local storage. Returns the local file URI. */
export async function downloadTrackAudio(trackId: number, format: 'original' | 'ogg' = 'original'): Promise<string | null> {
  if (!FS) return null;
  try {
    ensureSubDir(AUDIO_SUBDIR);
    const doc = getDocDir();
    if (!doc) return null;
    const dest = new FS.File(doc, AUDIO_SUBDIR, `track_${trackId}.audio`);
    const streamUrl = api.getStreamUrl(trackId, format);
    const downloaded = await FS.File.downloadFileAsync(streamUrl, dest, {
      headers: getAuthHeaders(),
      idempotent: true,
    });
    return downloaded.uri;
  } catch {
    return null;
  }
}

/** Download album artwork to local storage. Returns the local file URI. */
export async function downloadArtwork(albumId: number): Promise<string | null> {
  if (!FS) return null;
  try {
    ensureSubDir(ARTWORK_SUBDIR);
    const doc = getDocDir();
    if (!doc) return null;
    const dest = new FS.File(doc, ARTWORK_SUBDIR, `album_${albumId}.img`);
    const artworkUrl = api.getArtworkUrl('album', albumId);
    const downloaded = await FS.File.downloadFileAsync(artworkUrl, dest, {
      headers: getAuthHeaders(),
      idempotent: true,
    });
    return downloaded.uri;
  } catch {
    return null;
  }
}

/** Check if a file exists locally. */
export async function fileExists(path: string): Promise<boolean> {
  if (!FS || !path) return false;
  try {
    const file = new FS.File(path);
    return file.exists;
  } catch {
    return false;
  }
}

/** Delete a locally stored file. */
export async function deleteFile(path: string): Promise<void> {
  if (!FS || !path) return;
  try {
    const file = new FS.File(path);
    if (file.exists) file.delete();
  } catch {
    // ignore
  }
}

/** Save JSON metadata to local storage. */
export async function saveMetadata(key: string, data: unknown): Promise<void> {
  if (!FS) return;
  try {
    ensureSubDir(METADATA_SUBDIR);
    const doc = getDocDir();
    if (!doc) return;
    const file = new FS.File(doc, METADATA_SUBDIR, `${key}.json`);
    if (!file.exists) file.create({ intermediates: true, overwrite: true });
    file.write(JSON.stringify(data));
  } catch {
    // non-fatal
  }
}

/** Load JSON metadata from local storage. */
export async function loadMetadata<T = unknown>(key: string): Promise<T | null> {
  if (!FS) return null;
  try {
    const doc = getDocDir();
    if (!doc) return null;
    const file = new FS.File(doc, METADATA_SUBDIR, `${key}.json`);
    if (!file.exists) return null;
    const raw = await file.text();
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Get total size of cached offline audio files in bytes. */
export async function getOfflineCacheSize(): Promise<number> {
  if (!FS) return 0;
  try {
    const doc = getDocDir();
    if (!doc) return 0;
    const dir = new FS.Directory(doc, AUDIO_SUBDIR);
    if (!dir.exists) return 0;
    return dir.size ?? 0;
  } catch {
    return 0;
  }
}

/** Clear all offline audio files. */
export async function clearAllOfflineAudio(): Promise<void> {
  if (!FS) return;
  try {
    const doc = getDocDir();
    if (!doc) return;
    const dir = new FS.Directory(doc, AUDIO_SUBDIR);
    if (dir.exists) dir.delete();
  } catch {
    // ignore
  }
}

/** Clear all cached artwork. */
export async function clearAllArtwork(): Promise<void> {
  if (!FS) return;
  try {
    const doc = getDocDir();
    if (!doc) return;
    const dir = new FS.Directory(doc, ARTWORK_SUBDIR);
    if (dir.exists) dir.delete();
  } catch {
    // ignore
  }
}
