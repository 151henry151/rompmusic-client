import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import TrackPlayer from 'react-native-track-player';

import App from './App';
import { androidPlaybackService } from './src/services/androidTrackPlayer';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
if (Platform.OS === 'android') {
  TrackPlayer.registerPlaybackService(() => androidPlaybackService);
}
registerRootComponent(App);
