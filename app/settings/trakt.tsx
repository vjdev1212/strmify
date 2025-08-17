import { SafeAreaView, ScrollView, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { StatusBar, Text, View } from '../../components/Themed';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { TraktTokens } from '@/utils/Trakt';
import { webLinking, webSecureStore, webClipboard } from '@/utils/Web';

// Trakt.tv API configuration from environment variables
const TRAKT_CLIENT_ID = process.env.EXPO_PUBLIC_TRAKT_CLIENT_ID || '';
const TRAKT_CLIENT_SECRET = process.env.EXPO_PUBLIC_TRAKT_CLIENT_SECRET || '';
const TRAKT_REDIRECT_URI = process.env.EXPO_PUBLIC_TRAKT_REDIRECT_URI || '';
const TRAKT_API_BASE = process.env.EXPO_PUBLIC_TRAKT_API_BASE || 'https://api.trakt.tv';

// Platform detection
const isWeb = Platform.OS === 'web';

// Validate required environment variables
const validateConfig = () => {
    const missing = [];
    if (!TRAKT_CLIENT_ID) missing.push('EXPO_PUBLIC_TRAKT_CLIENT_ID');
    if (!TRAKT_CLIENT_SECRET) missing.push('EXPO_PUBLIC_TRAKT_CLIENT_SECRET');
    if (!TRAKT_REDIRECT_URI) missing.push('EXPO_PUBLIC_TRAKT_REDIRECT_URI');

    if (missing.length > 0) {
        console.error('Missing required environment variables:', missing.join(', '));
        return false;
    }
    return true;
};


const TraktAuthScreen = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [userInfo, setUserInfo] = useState<any>(null);

    const pollingRef = useRef<any>(null);
    const timeoutRef = useRef<any>(null);

    useEffect(() => {
        checkAuthStatus();

        // Handle URL parameters for web OAuth redirect
        if (isWeb) {
            handleWebAuthRedirect();
        } else {
            // Handle deep link when app is opened from background
            const handleDeepLink = (event: { url: string }) => {
                handleAuthRedirect(event.url);
            };

            // Add event listener for deep links
            const subscription = webLinking.addEventListener('url', handleDeepLink);

            // Check if app was opened with a deep link
            webLinking.getInitialURL().then((url) => {
                if (url) {
                    handleAuthRedirect(url);
                }
            });

            return () => {
                subscription?.remove();
                cleanup();
            };
        }

        return cleanup;
    }, []);

    // Handle web OAuth redirect by checking URL parameters
    const handleWebAuthRedirect = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
            console.error('Auth error:', error);
            showAlert('Authentication Failed', `Error: ${error}`);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        if (code) {
            console.log('Received auth code from redirect:', code);
            exchangeCodeForTokens(code);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };

    // Exchange authorization code for tokens (for redirect flow)
    const exchangeCodeForTokens = async (code: string) => {
        try {
            setIsLoading(true);

            const response = await fetch(`${TRAKT_API_BASE}/oauth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'trakt-api-version': '2',
                    'trakt-api-key': TRAKT_CLIENT_ID,
                },
                body: JSON.stringify({
                    code: code,
                    client_id: TRAKT_CLIENT_ID,
                    client_secret: TRAKT_CLIENT_SECRET,
                    redirect_uri: TRAKT_REDIRECT_URI,
                    grant_type: 'authorization_code',
                }),
            });

            if (response.ok) {
                const tokens: TraktTokens = await response.json();
                tokens.created_at = Math.floor(Date.now() / 1000);

                await webSecureStore.setItem('trakt_tokens', JSON.stringify(tokens));

                setIsAuthenticated(true);
                setIsLoading(false);

                await fetchUserInfo(tokens.access_token);

                if (!isWeb && isHapticsSupported()) {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }

                showAlert('Success', 'Successfully connected to Trakt.tv!');
            } else {
                throw new Error(`Failed to exchange code for tokens: ${response.status}`);
            }
        } catch (error) {
            console.error('Token exchange error:', error);
            setIsLoading(false);
            showAlert('Error', 'Failed to complete authentication');
        }
    };

    // Handle when screen comes into focus (useful for detecting when user returns from browser)
    useFocusEffect(
        useCallback(() => {
            if (isLoading) {
                // User came back from browser, check if they completed auth
                // The polling will handle the token exchange for device flow
            }
        }, [isLoading])
    );

    const cleanup = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    const handleAuthRedirect = (url: string) => {
        console.log('Received deep link:', url);

        // Parse the URL to extract path and parameters
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const searchParams = urlObj.searchParams;

            console.log('Path:', pathname);
            console.log('Params:', Object.fromEntries(searchParams));

            // Check if this is our Trakt auth redirect
            if (pathname === '/settings/trakt' || url.includes('settings/trakt')) {
                console.log('Trakt auth redirect detected for settings/trakt');

                const code = searchParams.get('code');
                const state = searchParams.get('state');
                const error = searchParams.get('error');

                if (error) {
                    console.error('Auth error:', error);
                    cleanup();
                    setIsLoading(false);
                    showAlert('Authentication Failed', `Error: ${error}`);
                    return;
                }

                if (code) {
                    console.log('Received auth code:', code);
                    exchangeCodeForTokens(code);
                }
            }
        } catch (error) {
            console.error('Error parsing auth redirect URL:', error);
        }
    };

    const checkAuthStatus = async () => {
        try {
            const tokens = await webSecureStore.getItem('trakt_tokens');
            if (tokens) {
                const parsedTokens: TraktTokens = JSON.parse(tokens);
                if (isTokenValid(parsedTokens)) {
                    setIsAuthenticated(true);
                    cleanup();
                    await fetchUserInfo(parsedTokens.access_token);
                } else {
                    // Try to refresh the token
                    await refreshAccessToken(parsedTokens);
                }
            }
        } catch (error) {
            console.error('Failed to check auth status:', error);
        }
    };

    const isTokenValid = (tokens: TraktTokens): boolean => {
        const expiresAt = tokens.created_at + tokens.expires_in;
        return Date.now() / 1000 < expiresAt;
    };
    
    const authenticateWithTrakt = async () => {
        try {
            setIsLoading(true);

            if (!isWeb && isHapticsSupported()) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
            }

            const authUrl = `https://trakt.tv/oauth/authorize?response_type=code&client_id=${TRAKT_CLIENT_ID}&redirect_uri=${encodeURIComponent(TRAKT_REDIRECT_URI)}&state=app_auth`;
            await webLinking.openURL(authUrl);
            return;
        } catch (error) {
            console.error('Authentication error:', error);
            cleanup();
            setIsLoading(false);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            showAlert('Error', `Failed to start authentication process: ${errorMessage}`);
        }
    };

    const refreshAccessToken = async (tokens: TraktTokens) => {
        try {
            const response = await fetch(`${TRAKT_API_BASE}/oauth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh_token: tokens.refresh_token,
                    client_id: TRAKT_CLIENT_ID,
                    client_secret: TRAKT_CLIENT_SECRET,
                    redirect_uri: TRAKT_REDIRECT_URI,
                    grant_type: 'refresh_token',
                }),
            });

            if (response.ok) {
                const newTokens: TraktTokens = await response.json();
                newTokens.created_at = Math.floor(Date.now() / 1000);

                await webSecureStore.setItem('trakt_tokens', JSON.stringify(newTokens));
                setIsAuthenticated(true);
                await fetchUserInfo(newTokens.access_token);
            } else {
                throw new Error('Failed to refresh token');
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            await logout();
        }
    };

    const fetchUserInfo = async (accessToken: string) => {
        try {
            const response = await fetch(`${TRAKT_API_BASE}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'trakt-api-version': '2',
                    'trakt-api-key': TRAKT_CLIENT_ID,
                },
            });

            if (response.ok) {
                const user = await response.json();
                console.log(user);
                setUserInfo(user);
            }
        } catch (error) {
            console.error('Failed to fetch user info:', error);
        }
    };

    const logout = async () => {
        try {
            if (!isWeb && isHapticsSupported()) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
            }

            await webSecureStore.deleteItem('trakt_tokens');
            setIsAuthenticated(false);
            setUserInfo(null);

            showAlert('Logged Out', 'Successfully disconnected from Trakt.tv');
        } catch (error) {
            console.error('Logout error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            showAlert('Error', `Failed to logout: ${errorMessage}`);
        }
    };

    const renderAuthenticatedView = () => (
        <>
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Trakt.tv Connected</Text>
                    <Text style={styles.sectionSubtitle}>Your account is successfully connected</Text>
                </View>

                {userInfo && (
                    <View style={styles.userInfoContainer}>
                        <Text style={styles.userInfoLabel}>Username:</Text>
                        <Text style={styles.userInfoValue}>{userInfo.username}</Text>

                        <Text style={styles.userInfoLabel}>Name:</Text>
                        <Text style={styles.userInfoValue}>{userInfo.name || 'Not provided'}</Text>

                        <Text style={styles.userInfoLabel}>Profile:</Text>
                        <Text style={styles.userInfoValue}>{userInfo.private ? 'Private' : 'Public'}</Text>

                        <Text style={styles.userInfoLabel}>VIP Status:</Text>
                        <Text style={styles.userInfoValue}>{userInfo.vip ? 'VIP Member' : 'Regular Member'}</Text>

                        {userInfo.vip_ep && (
                            <>
                                <Text style={styles.userInfoLabel}>VIP EP:</Text>
                                <Text style={styles.userInfoValue}>Active</Text>
                            </>
                        )}

                        <Text style={styles.userInfoLabel}>Account Type:</Text>
                        <Text style={styles.userInfoValue}>{userInfo.director ? 'Director' : 'Standard User'}</Text>
                    </View>
                )}
            </View>

            <Pressable
                style={({ pressed }) => [
                    styles.logoutButton,
                    pressed && styles.buttonPressed
                ]}
                onPress={logout}
            >
                <Text style={styles.logoutButtonText}>Disconnect Account</Text>
            </Pressable>
        </>
    );

    const renderUnauthenticatedView = () => (
        <>
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Connect to Trakt.tv</Text>
                    <Text style={styles.sectionSubtitle}>
                        Connect your Trakt.tv account to sync your watched history, ratings, and collections
                    </Text>
                </View>

                <View style={styles.featureList}>
                    <Text style={styles.featureItem}>• Sync watched episodes and movies</Text>
                    <Text style={styles.featureItem}>• Access your ratings and reviews</Text>
                    <Text style={styles.featureItem}>• Manage your watchlist</Text>
                    <Text style={styles.featureItem}>• View your collection</Text>
                </View>
            </View>

            <Pressable
                style={({ pressed }) => [
                    styles.connectButton,
                    pressed && styles.buttonPressed,
                    isLoading && styles.buttonDisabled
                ]}
                onPress={authenticateWithTrakt}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Text style={styles.connectButtonText}>
                        Connect to Trakt.tv
                    </Text>

                )}
            </Pressable>
        </>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={styles.scrollView}
            >
                {renderAuthenticatedView()}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 30,
        width: '100%',
        maxWidth: 780,
        alignSelf: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 30,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#888',
        lineHeight: 20,
    },
    featureList: {
        marginTop: 16,
        gap: 8,
    },
    featureItem: {
        fontSize: 14,
        color: '#aaa',
        lineHeight: 20,
    },
    authMethodContainer: {
        marginBottom: 24,
    },
    authMethodTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 12,
        textAlign: 'center',
    },
    authMethodButtons: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'center',
    },
    authMethodButton: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        maxWidth: 150,
    },
    authMethodButtonActive: {
        backgroundColor: 'rgba(83, 90, 255, 0.2)',
        borderColor: '#535aff',
    },
    authMethodButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ccc',
        marginBottom: 4,
    },
    authMethodButtonTextActive: {
        color: '#535aff',
    },
    authMethodDescription: {
        fontSize: 12,
        color: '#888',
        textAlign: 'center',
    },
    userInfoContainer: {
        marginTop: 16,
        gap: 12,
    },
    userInfoLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#fff',
    },
    userInfoValue: {
        fontSize: 14,
        color: '#ccc',
        marginBottom: 8,
    },
    deviceCodeContainer: {
        marginTop: 24,
        gap: 24,
    },
    urlContainer: {
        alignItems: 'center',
    },
    urlLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 12,
    },
    urlButton: {
        backgroundColor: 'rgba(83, 90, 255, 0.1)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#535aff',
    },
    urlText: {
        fontSize: 14,
        color: '#535aff',
        textAlign: 'center',
    },
    codeContainer: {
        alignItems: 'center',
    },
    codeLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 12,
    },
    codeDisplay: {
        backgroundColor: 'rgba(83, 90, 255, 0.2)',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#535aff',
        minWidth: 200,
        alignItems: 'center',
    },
    codeText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#535aff',
        letterSpacing: 4,
        textAlign: 'center',
    },
    copyHint: {
        fontSize: 12,
        color: '#888',
        marginTop: 8,
        fontStyle: 'italic',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    statusText: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 20,
        flex: 1,
    },
    connectButton: {
        backgroundColor: '#535aff',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#535aff',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        width: 200,
        alignSelf: 'center',
    },
    logoutButton: {
        backgroundColor: '#ff4757',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#ff4757',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        width: 200,
        alignSelf: 'center',
    },
    cancelButton: {
        backgroundColor: '#6c757d',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        alignSelf: 'center',
        minWidth: 120,
    },
    buttonPressed: {
        transform: [{ scale: 0.98 }],
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    connectButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    helpText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        lineHeight: 16,
        fontStyle: 'italic',
    },
});

export default TraktAuthScreen;