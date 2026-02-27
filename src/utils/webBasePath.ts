/**
 * Web base path for the app (e.g. "app" for rompmusic.com/app, "client" for demo).
 * Use this instead of deriving from window.location.pathname, which can be wrong
 * when the URL has been pushed to e.g. /Library (causing 404 on reload/logo).
 */
export function getWebBasePath(): string {
  if (typeof process === 'undefined' || !process.env?.EXPO_PUBLIC_WEB_BASE_URL) {
    return 'app';
  }
  const base = process.env.EXPO_PUBLIC_WEB_BASE_URL;
  return typeof base === 'string' ? base.replace(/^\/+/, '') : 'app';
}
