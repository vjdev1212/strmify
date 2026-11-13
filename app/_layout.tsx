import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { Appearance, Platform, View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { applyUserInterfaceStyle, getUserInterfaceStyle } from '@/utils/UserInterfaceStyle';

applyUserInterfaceStyle(getUserInterfaceStyle());

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
    const { colors, colorScheme } = useTheme();
    const navigationTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
    const pathname = usePathname();

    useEffect(() => {
        if (__DEV__) {
            console.info(
                `[appearance-debug] React Native scheme: ${Appearance.getColorScheme()}; theme scheme: ${colorScheme}; Expo setting: ${Constants.expoConfig?.userInterfaceStyle ?? 'unset'}`,
            );
        }
    }, [colorScheme]);

    useEffect(() => {
        if (Platform.OS === 'web' || pathname === '/stream/player') return;

        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
            .catch(error => console.warn('Failed to lock app portrait orientation:', error));
    }, [pathname]);

    const HeaderBackground = () => (
        <BlurView intensity={20} tint={colorScheme} style={styles.headerBlur}>
            <View style={[styles.headerGlass, { backgroundColor: colors.backgroundOverlay, borderBottomColor: colors.border }]} />
        </BlurView>
    );

    const InvisibleHeaderBackground = () => (
        <View style={{ flex: 1, backgroundColor: 'transparent' }} />
    );

    const screenOptions = {
        headerShown: true,
        headerTransparent: true,
        headerUserInterfaceStyle: colorScheme,
        headerBackButtonDisplayMode: 'minimal' as const,
        headerBackground: InvisibleHeaderBackground,
        headerTitle: '',
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        headerBackTitle: '',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: 'transparent' },
        contentStyle: { backgroundColor: colors.background },
    };

    return (
        <ThemeProvider value={{
            ...navigationTheme,
            colors: {
                ...navigationTheme.colors,
                primary: colors.primary,
                background: colors.background,
                card: colors.primaryCard,
                text: colors.text,
                border: colors.border,
                notification: colors.primary,
            },
        }}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack
                    screenOptions={{
                        headerUserInterfaceStyle: colorScheme,
                        headerBackButtonDisplayMode: 'minimal',
                        headerBackTitle: '',
                        headerTintColor: colors.text,
                        headerTitleStyle: { color: colors.text },
                        headerTransparent: false,
                        headerStyle: { backgroundColor: 'transparent' },
                        headerBackground: InvisibleHeaderBackground,
                        contentStyle: { backgroundColor: colors.background },
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
                            contentStyle: { backgroundColor: colors.background },
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
                            contentStyle: { backgroundColor: colors.background },
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
                    <Stack.Screen name="settings/appearance" options={{ ...screenOptions, title: 'Appearance', headerTitle: 'Appearance' }} />
                    <Stack.Screen name="settings/home" options={{ ...screenOptions, title: 'Manage Lists', headerTitle: 'Manage Lists' }} />
                    <Stack.Screen
                        name="settings/home-editor"
                        options={{
                            ...screenOptions,
                            presentation: 'card',
                            headerShown: true,
                            title: 'Add List',
                            headerTitle: 'Add List',
                        }}
                    />
                </Stack>
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
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: 'transparent',
    },
});

export const globalGlassStyles = StyleSheet.create({
    glassContainer: {
        backgroundColor: Colors.backgroundCard,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 20,
        borderCurve: 'continuous',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
    },
    glassCard: {
        backgroundColor: Colors.backgroundCard,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 14,
        borderCurve: 'continuous',
        padding: 16,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
    },
    glassButton: {
        backgroundColor: Colors.primarySubtle,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 999,
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    glassOverlay: {
        backgroundColor: Colors.backgroundOverlay,
        borderRadius: 14,
        borderCurve: 'continuous',
        padding: 12,
    },
    glassText: {
        color: Colors.text,
    },
});