import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';
import { androidPlaybackService } from './src/services/androidTrackPlayer';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
if (Platform.OS === 'android') {
  try {
    const TrackPlayer = require('react-native-track-player').default as {
      registerPlaybackService: (serviceFactory: () => Promise<void>) => void;
    };
    TrackPlayer.registerPlaybackService(androidPlaybackService);
  } catch {
    // Expo Go iOS/Android does not include this native module.
  }
}
registerRootComponent(App);
