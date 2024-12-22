import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, Theme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from '@/components/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  const LightTheme: Theme = {
    dark: false,
    colors: {
      primary: 'rgb(0, 122, 255)',
      background: 'rgb(255, 255, 255)',
      card: 'rgb(255, 255, 255)',
      text: 'rgb(28, 28, 30)',
      border: 'rgb(216, 216, 216)',
      notification: 'rgb(255, 59, 48)',
    },
    fonts: {
      regular: {
        fontFamily: '',
        fontWeight: 'bold'
      },
      medium: {
        fontFamily: '',
        fontWeight: 'bold'
      },
      bold: {
        fontFamily: '',
        fontWeight: 'bold'
      },
      heavy: {
        fontFamily: '',
        fontWeight: 'bold'
      }
    }
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : LightTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Home' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="movie/details" options={{ headerShown: true, headerTransparent: true, headerTitle: '', headerTintColor: '#535aff' }} />
        <Stack.Screen name="movie/list" options={{ headerShown: true, headerTitle: '', headerTintColor: '#535aff' }} />
        <Stack.Screen name="series/details" options={{ headerShown: true, headerTransparent: true, headerTitle: '', headerTintColor: '#535aff' }} />
        <Stack.Screen name="series/list" options={{ headerShown: true, headerTitle: '', headerTintColor: '#535aff' }} />
        <Stack.Screen name="addons/add" options={{ headerShown: true, headerTitle: '', headerTintColor: '#535aff' }} />
        <Stack.Screen name="stream/list" options={{ headerShown: true, headerTitle:"Streams", headerTintColor: '#535aff' }} />
        <Stack.Screen name="settings/stremioserver" options={{ headerShown: true, headerTitle:'', headerTintColor: '#535aff' }} />
        <Stack.Screen name="settings/torrserver" options={{ headerShown: true, headerTitle:'', headerTintColor: '#535aff' }} />
        <Stack.Screen name="settings/contact" options={{ headerShown: true, headerTitle:'', headerTintColor: '#535aff' }} />
        <Stack.Screen name="settings/donate" options={{ headerShown: true, headerTitle:'', headerTintColor: '#535aff' }} />
      </Stack>
    </ThemeProvider>
  );
}
