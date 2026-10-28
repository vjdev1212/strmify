import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { DarkTheme, ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/context/ThemeContext';
import BlurGradientBackground from '@/components/BlurGradientBackground';
import NativeAlertDialogHost from '@/components/NativeAlertDialogHost';
import { Colors, systemDarkBackground } from '@/constants/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
    anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [loaded, error] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
        ...FontAwesome.font,
    });

    useEffect(() => { if (error) throw error; }, [error]);
    useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);

    if (!loaded) return null;

    return <RootLayoutNav />;
}

function RootLayoutNav() {
    const { colors } = useTheme();

    const HeaderBackground = () => (
        <BlurView intensity={20} style={styles.headerBlur}>
            <View style={[styles.headerGlass, { borderBottomColor: colors.border }]} />
        </BlurView>
    );

    const InvisibleHeaderBackground = () => (
        <View style={{ flex: 1, backgroundColor: 'transparent' }} />
    );

    const screenOptions = {
        headerShown: true,
        headerTransparent: true,
        headerUserInterfaceStyle: 'dark' as const,
        headerBackButtonDisplayMode: 'minimal' as const,
        headerBackground: InvisibleHeaderBackground,
        headerTitle: '',
        headerTintColor: colors.text,
        headerBackTitle: '',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: 'transparent' },
        contentStyle: { backgroundColor: systemDarkBackground },
    };

    return (
        <ThemeProvider value={{
            ...DarkTheme,
            colors: { ...DarkTheme.colors, background: Colors.background },
        }}>
            <View style={[styles.container, { backgroundColor: systemDarkBackground }]}>
                <BlurGradientBackground />
                <Stack
                    screenOptions={{
                        headerUserInterfaceStyle: 'dark',
                        headerBackButtonDisplayMode: 'minimal',
                        headerBackTitle: '',
                        headerTintColor: colors.text,
                        headerTransparent: false,
                        headerStyle: { backgroundColor: 'transparent' },
                        headerBackground: InvisibleHeaderBackground,
                        contentStyle: { backgroundColor: systemDarkBackground },
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
                            headerTintColor: colors.text,
                            headerBackTitle: '',
                            title: 'Home',
                            contentStyle: { backgroundColor: systemDarkBackground },
                        }}
                    />
                    <Stack.Screen name="movie/details" options={{
                        ...screenOptions,
                        headerBackground: InvisibleHeaderBackground,
                        headerStyle: { backgroundColor: 'transparent' }
                    }} />
                    <Stack.Screen name="movie/list" options={screenOptions} />
                    <Stack.Screen name="series/details" options={{
                        ...screenOptions,
                        headerBackground: InvisibleHeaderBackground,
                        headerStyle: { backgroundColor: 'transparent' }
                    }} />
                    <Stack.Screen name="series/list" options={screenOptions} />
                    <Stack.Screen name="stream/list" options={screenOptions} />
                    <Stack.Screen
                        name="stream/player"
                        options={{
                            headerShown: false,
                            contentStyle: { backgroundColor: systemDarkBackground },
                        }}
                    />
                    <Stack.Screen name="settings/addons" options={{ ...screenOptions, title: 'Add-ons', headerTitle: 'Add-ons' }} />
                    <Stack.Screen name="settings/add" options={{ ...screenOptions, title: 'Add Add-on', headerTitle: 'Add Add-on' }} />
                    <Stack.Screen name="settings/stremioserver" options={{ ...screenOptions, title: 'Stremio', headerTitle: 'Stremio' }} />
                    <Stack.Screen name="settings/opensubtitles" options={{ ...screenOptions, title: 'OpenSubtitles', headerTitle: 'OpenSubtitles' }} />
                    <Stack.Screen name="settings/contact" options={{ ...screenOptions, title: 'Contact', headerTitle: 'Contact' }} />
                    <Stack.Screen name="settings/disclaimer" options={{ ...screenOptions, title: 'Disclaimer', headerTitle: 'Disclaimer' }} />
                    <Stack.Screen name="settings/donate" options={{ ...screenOptions, title: 'Support Strmify', headerTitle: 'Support Strmify' }} />
                    <Stack.Screen name="settings/downloads" options={{ ...screenOptions, title: 'Downloads', headerTitle: 'Downloads' }} />
                    <Stack.Screen name="settings/mediaplayer" options={{ ...screenOptions, title: 'Media Player', headerTitle: 'Media Player' }} />
                </Stack>
                <NativeAlertDialogHost />
            </View>
        </ThemeProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        backgroundColor: 'rgba(28, 28, 30, 0.92)',
        borderWidth: 1,
        borderColor: '#38383A',
        borderRadius: 20,
        borderCurve: 'continuous',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
    },
    glassCard: {
        backgroundColor: '#1C1C1E',
        borderWidth: 1,
        borderColor: '#38383A',
        borderRadius: 14,
        borderCurve: 'continuous',
        padding: 16,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
    },
    glassButton: {
        backgroundColor: '#2C2C2E',
        borderWidth: 1,
        borderColor: '#48484A',
        borderRadius: 999,
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    glassOverlay: {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 14,
        borderCurve: 'continuous',
        padding: 12,
    },
    glassText: {
        color: '#ffffff',
    },
});