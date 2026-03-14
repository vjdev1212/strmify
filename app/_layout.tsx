import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { AppThemeProvider } from '@/context/ThemeContext';
import BlurGradientBackground from '@/components/BlurGradientBackground';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const HeaderBackground = () => (
    <BlurView intensity={20} style={styles.headerBlur}>
      <View style={styles.headerGlass} />
    </BlurView>
  );

  const InvisibleHeaderBackground = () => (
    <View style={{ flex: 1, backgroundColor: 'transparent' }} />
  );

  const screenOptions = {
    headerShown: true,
    headerTransparent: true,
    headerBackground: InvisibleHeaderBackground,
    headerTitle: '',
    headerTintColor: '#ffffff',
    headerBackTitle: '',
    headerShadowVisible: false,
    headerStyle: { backgroundColor: 'transparent' },
  };

  return (
    <View style={styles.container}>
      <AppThemeProvider>
        <BlurGradientBackground />
        <ActionSheetProvider>
          <Stack
            screenOptions={{
              headerStyle: styles.glassHeader,
              headerBackground: HeaderBackground,
              contentStyle: styles.screenContent,
            }}
          >
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
                headerTransparent: true,
                headerBackground: InvisibleHeaderBackground,
                headerShadowVisible: false,
                headerTitle: '',
                headerTintColor: '#ffffff',
                headerBackTitle: '',
                title: 'Home',
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
            <Stack.Screen name="modal" options={{ presentation: 'modal', contentStyle: styles.modalContent }} />
            <Stack.Screen name="movie/details" options={screenOptions} />
            <Stack.Screen name="movie/list" options={screenOptions} />
            <Stack.Screen name="series/details" options={screenOptions} />
            <Stack.Screen name="series/list" options={screenOptions} />
            <Stack.Screen name="stream/list" options={screenOptions} />
            <Stack.Screen name="stream/player" options={{ headerShown: false, headerTransparent: true, headerBackground: InvisibleHeaderBackground }} />
            <Stack.Screen name="settings/addons" options={screenOptions} />
            <Stack.Screen name="settings/add" options={screenOptions} />
            <Stack.Screen name="settings/stremioserver" options={screenOptions} />
            <Stack.Screen name="settings/theme" options={screenOptions} />
            <Stack.Screen name="settings/opensubtitles" options={screenOptions} />
            <Stack.Screen name="settings/contact" options={screenOptions} />
            <Stack.Screen name="settings/disclaimer" options={screenOptions} />
            <Stack.Screen name="settings/donate" options={screenOptions} />
            <Stack.Screen name="settings/downloads" options={screenOptions} />
            <Stack.Screen name="settings/mediaplayer" options={screenOptions} />
          </Stack>
        </ActionSheetProvider>
      </AppThemeProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContent: {
    backgroundColor: 'transparent',
  },
  modalContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  glassHeader: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerBlur: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerGlass: {
    flex: 1,
    backgroundColor: 'rgba(18, 18, 18, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
});

export const globalGlassStyles = StyleSheet.create({
  glassContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  glassButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  glassOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 12,
  },
  glassText: {
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});