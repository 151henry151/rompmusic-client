/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const DEFAULT_WEBSITE_URL = 'https://rompmusic.com';

function normalizeWebsiteBase(raw: string): string {
  try {
    const parsed = new URL(raw);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return DEFAULT_WEBSITE_URL;
  }
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
