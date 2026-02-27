# RompMusic Client: Play Store & App Store Compliance and Android/iOS Readiness

This document lists **required and recommended changes** for Play Store and App Store compliance, plus **possible issues and areas to test** for Android and iOS. The client has not been tested on physical iOS or Android devices yet.

---

## Implemented in code/config (done)

The following have been implemented and no longer require code changes:

- **iOS background audio**: `app.json` → `ios.infoPlist.UIBackgroundModes: ["audio"]`.
- **Android target SDK 34**: `expo-build-properties` added to `app.json` with `android.targetSdkVersion: 34`.
- **Version alignment**: `app.json` version set to `0.1.0-beta.3`; About screen reads version from `Constants.expoConfig?.version`.
- **Account deletion**: Server `DELETE /api/v1/auth/me` (deletes user and related data); client Settings → "Delete account" with confirmation; `api.deleteAccount()` and `authStore.deleteAccount()`.
- **Env**: `.env.example` documents `EXPO_PUBLIC_WEBSITE_URL` for production Privacy/Terms links.

**Still required before submit (no code):** Replace in `eas.json`: `YOUR_APPLE_ID` and `YOUR_APP_STORE_CONNECT_APP_ID` with real values (JSON does not support comments). For Play production release, set `submit.production.android.track` to `"production"` in `eas.json`.

---

## 1. Apple App Store compliance

### 1.1 Required

| Requirement | Current state | Action |
|-------------|---------------|--------|
| **Privacy policy URL** | ✅ Settings has "Privacy Policy" linking to `{WEBSITE_BASE}/privacy` (rompmusic.com/privacy). Website has `/privacy` page. | Ensure `EXPO_PUBLIC_WEBSITE_URL` is set for production (e.g. `https://rompmusic.com`) so the link is correct. Add the same URL in App Store Connect. |
| **Privacy nutrition labels** | ❌ Not configured | In App Store Connect → App Privacy, declare: account/credentials (auth token), usage data (play history if sent to server). State “Data not linked to you” where applicable; no tracking. |
| **Account deletion** | ❌ Not implemented | Apple requires in-app account deletion for apps that allow account creation. **Add:** (1) Server: `DELETE /api/v1/auth/me` or `POST /api/v1/auth/delete-account` that deletes the user and invalidates tokens. (2) Client: “Delete account” in Settings (with confirmation). Call API then clear local storage and log out. |
| **Support URL** | ⚠️ Unset | App Store Connect requires a support URL. Use e.g. `https://rompmusic.com` or a dedicated /support page and add in metadata. |
| **Age rating** | ⚠️ Unset | Complete the age rating questionnaire in App Store Connect (likely “No objectionable content” for a music streaming app). |
| **Copyright** | ⚠️ Unset | Set in App Store Connect (e.g. “2024 RompMusic Contributors” or your entity). |

### 1.2 iOS-specific configuration

| Item | Current state | Action |
|------|---------------|--------|
| **Background audio** | ✅ Done | `app.json` has `ios.infoPlist.UIBackgroundModes: ["audio"]`. `audioService.ts` already sets `shouldPlayInBackground: true`. |
| **Bundle ID** | ✅ Set | `com.rompmusic.app` in app.json. |
| **Lock screen / Now Playing** | ✅ Used | `setLockScreenMetadata` / `setActiveForLockScreen` in playerStore (expo-audio). Verify on device that lock screen controls and metadata appear. |
| **Privacy manifest (Required Reason APIs)** | ⚠️ Unclear | If the app or dependencies use UserDefaults, file timestamps, device identifiers, etc., Apple may require a privacy manifest. Expo/SDKs might add one; check after prebuild and add if needed. |
| **ATS (App Transport Security)** | ✅ Default | All API calls use HTTPS. If you ever need a custom server with HTTP (e.g. dev), use an exception in `infoPlist` only for non-production. |

### 1.3 EAS Submit (iOS)

- In `eas.json`, replace `YOUR_APPLE_ID` and `YOUR_APP_STORE_CONNECT_APP_ID` with real values before running `eas submit`.

---

## 2. Google Play Store compliance

### 2.1 Required

| Requirement | Current state | Action |
|-------------|---------------|--------|
| **Target API level** | ✅ Done | `expo-build-properties` in `app.json` with `android.targetSdkVersion: 34`. |
| **Data safety form** | ❌ Not completed | In Play Console → Data safety: declare what data is collected (e.g. account credentials, server URL, play history if stored on server). State whether data is shared with third parties and how it’s secured. Even “no collection” must be declared. |
| **Privacy policy URL** | ✅ Same as iOS | Settings → Privacy Policy → website. Add the same URL in Play Console store listing. |
| **Content rating** | ❌ Not completed | Complete the questionnaire in Play Console (likely everyone for a music app). |

### 2.2 Android-specific configuration

| Item | Current state | Action |
|------|---------------|--------|
| **Package name** | ✅ Set | `com.rompmusic.app` in app.json. |
| **Adaptive icon** | ✅ Set | `adaptive-icon.png` and `backgroundColor` in app.json. |
| **Edge-to-edge** | ✅ Set | `edgeToEdgeEnabled: true`. Test on Android 15+ for layout/insets. |
| **Predictive back** | ⚠️ Disabled | `predictiveBackGestureEnabled: false`. Consider enabling for modern Android UX; test navigation and modals. |
| **Permissions** | ✅ Minimal | No extra permissions in app.json. App uses network (INTERNET is default). SecureStore/AsyncStorage don’t require runtime permissions. Verify no unnecessary permissions after prebuild. |
| **Cleartext traffic** | ✅ N/A | Production uses HTTPS. If a user points to an HTTP server URL, Android may block it; document that HTTPS is required or handle in app. |

### 2.3 EAS Submit (Android)

- `eas.json` has `"track": "internal"` for production submit. Change to `production` when publishing to production track.

---

## 3. Version and metadata consistency

| Item | Current state | Action |
|------|---------------|--------|
| **app.json version** | ✅ 0.1.0-beta.3 | Aligned with package.json. |
| **package.json version** | 0.1.0-beta.3 | Bump when releasing. |
| **About screen** | ✅ From config | Reads `Constants.expoConfig?.version` so it stays in sync with app.json. |
| **EAS production** | `autoIncrement: true` | Build numbers auto-increment; ensure version string is set for each store.

---

## 4. Possible issues and areas to test on Android and iOS

### 4.1 Audio and playback

- **Background playback**: After adding `UIBackgroundModes: ["audio"]` on iOS, test that playback continues when the app is in the background or the device is locked. Confirm lock screen controls and metadata.
- **expo-audio on native**: All playback goes through expo-audio. Test play/pause, seek, next/previous, and “Play album” on both platforms. Check for crashes or freezes when switching tracks or opening/closing the full-screen player.
- **Streaming**: Test over Wi‑Fi and cellular; handle slow or failing loads (errors are set in store; confirm UI shows them).
- **Format**: Native uses `getEffectiveStreamFormat()` from settings (e.g. OGG vs original). Test both and confirm no playback errors.

### 4.2 UI and navigation

- **Safe area / notch**: Safe area insets are used (e.g. `AuthenticatedLayout`). Test on notched iPhones and Android devices with punch holes or notches.
- **Keyboard**: `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` is used on login, register, verify email, forgot/reset password, server setup. Test keyboard covering inputs and dismissal on both platforms.
- **Scroll and lists**: Library (artists/albums), search, and history use long lists. Test scroll performance and “Load more” on low-end devices.
- **Orientation**: `orientation: "portrait"` in app.json. If you later allow landscape, test player and list layouts.

### 4.3 Auth and storage

- **expo-secure-store (iOS/Android)**: Used for token when `Platform.OS !== 'web'`. Confirm login persists after app kill and that logout clears the token.
- **Server URL**: Stored in AsyncStorage. Test changing server URL, then restarting app; confirm it uses the new URL and doesn’t leave stale tokens.

### 4.4 Sharing and links

- **Share**: `Share.share()` is used on native (album and track share). On iOS, `url` is passed when `Platform.OS === 'ios'`. Test share sheet and that shared links open correctly (e.g. in browser or back into app if you add deep links later).
- **Linking**: Settings opens Privacy Policy and Terms via `Linking.openURL()`. Verify URLs open in the browser and that `EXPO_PUBLIC_WEBSITE_URL` is correct in production builds.

### 4.5 Alerts and dialogs

- **Alert.alert**: Used for errors and success on login, register, verify email, forgot/reset password, and some share fallbacks. On native, `Alert.alert` is the system dialog. Test that all flows show appropriate messages and don’t rely on web-only behavior.

### 4.6 Artwork and images

- **ArtworkImage**: On native it uses React Native `Image` with a tokenized URL. Test loading and failure (e.g. 404) on both platforms; placeholder/icon fallback is implemented.
- **Defer**: Defer loading is only used on web (IntersectionObserver). Native sets `visible` true immediately; no change needed.

### 4.7 Deep linking (optional for v1)

- **Web**: Linking is configured for web (base path, `getStateFromPath`). **Native**: No `scheme` or universal links in app.json, so links like `https://rompmusic.com/app/album/123` won’t open the native app. For store launch this is optional; add later if you want “Open in app” from the website.

### 4.8 First-run and server setup

- **ServerSetupScreen**: Shown when no server URL is stored. Test flow: enter URL → save → logout; confirm next launch goes to login/home. Test invalid URL handling and error message.

### 4.9 Dependencies and native modules

- **expo-secure-store**: Has a plugin in app.json. No extra config found.
- **expo-audio**: No plugin in app.json; add iOS `infoPlist.UIBackgroundModes` as above.
- **React Native Paper**: Themed and used across the app; test theme (dark) and icons on both platforms.
- **@react-native-community/slider**: Used in player; test seek bar on both platforms.

---

## 5. Checklist summary

**Before first iOS TestFlight / internal testing**

- [x] Add `ios.infoPlist.UIBackgroundModes: ["audio"]` to app.json.
- [ ] Verify privacy policy and terms URLs open correctly from the app (set `EXPO_PUBLIC_WEBSITE_URL` for production).
- [x] Implement account deletion (server `DELETE /auth/me` + Settings "Delete account").
- [ ] Set EAS submit `appleId` and `ascAppId` in eas.json when ready to submit.
- [x] Sync version strings (app.json, About from config).
- [ ] Test on a physical iPhone (background audio, lock screen, keyboard, share, auth).

**Before first Android internal testing**

- [x] Add expo-build-properties and set `android.targetSdkVersion` to 34.
- [ ] Verify privacy policy URL in app and in Play Console.
- [ ] Test on a physical Android device (background audio, notifications if any, keyboard, share, auth).

**Before App Store submission (store console only)**

- [ ] App Store Connect: privacy nutrition labels, support URL, age rating, copyright.
- [x] Account deletion is implemented and ready to test.

**Before Play Store submission (store console only)**

- [ ] Play Console: Data safety form, content rating questionnaire.
- [x] Target API level 34 is set in app.json.

---

## 6. References

- [Expo app.json](https://docs.expo.dev/versions/latest/config/app/)
- [Expo iOS config](https://docs.expo.dev/versions/latest/config/app/#ios)
- [Expo Android config](https://docs.expo.dev/versions/latest/config/app/#android)
- [expo-build-properties](https://docs.expo.dev/versions/latest/sdk/build-properties/)
- [Expo Audio (expo-audio)](https://docs.expo.dev/versions/latest/sdk/audio/)
- [Apple App Store submitting](https://developer.apple.com/app-store/submitting/)
- [Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/)
- [Google Play target API level](https://developer.android.com/google/play/requirements/target-sdk)
- [Google Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- Project: `APP_STORE_SUBMISSION_PLAN.md` (prerequisites, EAS build/submit, store listings overview).
