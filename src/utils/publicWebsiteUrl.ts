/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const DEFAULT_WEBSITE_URL = 'https://rompmusic.com';

function normalizeWebsiteBase(raw: string): string {
  const trimmed = raw.trim();
  // Avoid relying on a global `URL` implementation in React Native.
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z\d+\-.]*):\/\//);
  if (!schemeMatch) return DEFAULT_WEBSITE_URL;

  const scheme = schemeMatch[1].toLowerCase();
  const rest = trimmed.slice(schemeMatch[0].length); // after "<scheme>://"
  const hostPort = rest.split(/[/?#]/)[0];
  if (!hostPort) return DEFAULT_WEBSITE_URL;

  return `${scheme}://${hostPort}`;
}

export function getWebsiteBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_WEBSITE_URL;
  if (typeof configured !== 'string' || configured.trim().length === 0) {
    return DEFAULT_WEBSITE_URL;
  }
  return normalizeWebsiteBase(configured.trim());
}

export function buildPublicPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getWebsiteBaseUrl()}${normalizedPath}`;
}
