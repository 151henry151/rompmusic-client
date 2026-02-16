/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Navigation param lists: root (auth + app) and in-app stack.
 */

/** Root navigator: App, Login, Register, VerifyEmail, ForgotPassword, ResetPassword */
export type RootStackParamList = {
  App: undefined;
  Login: undefined;
  Register: undefined;
  VerifyEmail: { email: string };
  ForgotPassword: { fromSettings?: boolean };
  ResetPassword: { email: string; fromSettings?: boolean };
};

/** In-app stack (inside App): Library, Settings, ArtistDetail, AlbumDetail, TrackDetail, ForgotPassword, ResetPassword */
export type AppStackParamList = {
  Library: undefined;
  Settings: undefined;
  ArtistDetail: { artistId?: number; artistIds?: number[]; artistName: string; isAssortedArtists?: boolean };
  AlbumDetail: { albumId?: number; albumIds?: number[]; highlightTrackId?: number };
  TrackDetail: { trackId: number };
  ForgotPassword: { fromSettings?: boolean };
  ResetPassword: { email: string; fromSettings?: boolean };
};
