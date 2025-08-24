import { SafeAreaView, ScrollView, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { StatusBar, Text, View } from '../../components/Themed';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { webLinking } from '@/utils/Web';
import { clearTraktTokens, getTraktUserInfo, isUserAuthenticated, saveTraktTokens, TraktTokens } from '@/clients/trakt';

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
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    useEffect(() => {
        initializeAuth();
    }, []);

    const initializeAuth = async () => {
        try {
            // Validate configuration first
            if (!validateConfig()) {
                showAlert('Configuration Error', 'Missing required Trakt.tv API configuration');
                setIsInitialized(true);
                return;
            }

            await checkAuthStatus();

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
                };
            }
        } catch (error) {
            console.error('Initialize auth error:', error);
        } finally {
            // Always set initialized to true after completing initialization
            setIsInitialized(true);
        }
    };

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

        if (code && state === 'app_auth') {
            console.log('Received auth code from redirect:', code);
            exchangeCodeForTokens(code);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };

    const handleAuthRedirect = (url: string) => {
        console.log('Received deep link:', url);

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
                    setIsLoading(false);
                    showAlert('Authentication Failed', `Error: ${error}`);
                    return;
                }

                if (code && state === 'app_auth') {
                    console.log('Received auth code:', code);
                    exchangeCodeForTokens(code);
                }
            }
        } catch (error) {
            console.error('Error parsing auth redirect URL:', error);
        }
    };

    // Exchange authorization code for tokens (OAuth flow)
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

                // Use service function to save tokens
                await saveTraktTokens(tokens);

                setIsAuthenticated(true);
                await fetchUserInfo();

                if (!isWeb && isHapticsSupported()) {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }

                showAlert('Success', 'Successfully connected to Trakt.tv!');
            } else {
                const errorData = await response.json();
                throw new Error(`Failed to exchange code for tokens: ${errorData.error || response.status}`);
            }
        } catch (error) {
            console.error('Token exchange error:', error);
            showAlert('Error', 'Failed to complete authentication');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (isLoading && !isWeb) {
                // User came back from browser on mobile, check auth status
                setTimeout(() => {
                    checkAuthStatus();
                }, 1000);
            }
        }, [isLoading])
    );

    const checkAuthStatus = async () => {
        try {
            // Use service function to check authentication
            const authenticated = await isUserAuthenticated();
            setIsAuthenticated(authenticated);
            
            if (authenticated) {
                await fetchUserInfo();
            }
        } catch (error) {
            console.error('Failed to check auth status:', error);
        }
    };
    
    const authenticateWithTrakt = async () => {
        if (!validateConfig()) {
            showAlert('Configuration Error', 'Missing required Trakt.tv API configuration');
            return;
        }

        try {
            setIsLoading(true);

            if (!isWeb && isHapticsSupported()) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
            }

            const authUrl = `https://trakt.tv/oauth/authorize?response_type=code&client_id=${TRAKT_CLIENT_ID}&redirect_uri=${encodeURIComponent(TRAKT_REDIRECT_URI)}&state=app_auth`;
            
            console.log('Opening auth URL:', authUrl);
            await webLinking.openURL(authUrl);

            // Don't set loading to false immediately - let the redirect handle it
        } catch (error) {
            console.error('Authentication error:', error);
            setIsLoading(false);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            showAlert('Error', `Failed to start authentication process: ${errorMessage}`);
        }
    };

    const fetchUserInfo = async () => {
        try {
            // Use service function to get user info
            const user = await getTraktUserInfo();
            if (user) {
                console.log('User info:', user);
                setUserInfo(user);
            } else {
                console.error('Failed to fetch user info');
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

            // Use service function to clear tokens
            await clearTraktTokens();
            setIsAuthenticated(false);
            setUserInfo(null);

            showAlert('Logged Out', 'Successfully disconnected from Trakt.tv');
        } catch (error) {
            console.error('Logout error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            showAlert('Error', `Failed to logout: ${errorMessage}`);
        }
    };

    const renderUserInfoTable = () => {
        if (!userInfo) return null;

        const userDetails = [
            { label: 'Username', value: userInfo.username },
            { label: 'Display Name', value: userInfo.name || 'Not provided' },
            { label: 'Profile Status', value: userInfo.private ? 'Private' : 'Public' },
            { label: 'Membership', value: userInfo.vip ? 'VIP Member' : 'Regular Member' },
            { label: 'Account Type', value: userInfo.director ? 'Director' : 'Standard User' },
            ...(userInfo.vip_ep ? [{ label: 'VIP EP', value: 'Active' }] : []),
        ];

        return (
            <View style={styles.tableContainer}>
                <Text style={styles.tableHeader}>Account Information</Text>
                <View style={styles.table}>
                    {userDetails.map((detail, index) => (
                        <View 
                            key={detail.label} 
                            style={[
                                styles.tableRow,
                                index === userDetails.length - 1 && styles.lastRow
                            ]}
                        >
                            <Text style={styles.tableLabel}>{detail.label}</Text>
                            <Text style={[
                                styles.tableValue,
                                detail.label === 'Membership' && userInfo.vip && styles.vipText,
                                detail.label === 'VIP EP' && styles.vipText
                            ]}>
                                {detail.value}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const renderAuthenticatedView = () => (
        <>
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <View style={styles.statusIndicator}>
                        <View style={styles.connectedDot} />
                        <Text style={styles.sectionTitle}>Trakt.tv Connected</Text>
                    </View>
                    <Text style={styles.sectionSubtitle}>Your account is successfully connected and syncing</Text>
                </View>

                {renderUserInfoTable()}
            </View>

            <Pressable
                style={({ pressed }) => [
                    styles.logoutButton,
                    pressed && styles.buttonPressed
                ]}
                onPress={logout}
            >
                <Text style={styles.logoutButtonText}>Disconnect</Text>
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

            {isLoading && !isWeb && (
                <Text style={styles.helpText}>
                    Waiting for you to complete authentication in your browser...
                </Text>
            )}
        </>
    );

    // Show loading indicator while initializing
    if (!isInitialized) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#535aff" size="large" />
                    <Text style={styles.loadingText}>Initializing...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={styles.scrollView}
            >
                {isAuthenticated ? renderAuthenticatedView() : renderUnauthenticatedView()}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: '#888',
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        marginBottom: 24,
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    connectedDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10b981',
        marginRight: 12,
    },
    sectionTitle: {
        fontSize: 30,
        fontWeight: '600',
        color: '#fff',
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#888',
        lineHeight: 20,
        marginTop: 4,
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
    tableContainer: {
        marginTop: 8,
    },
    tableHeader: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 16,
    },
    table: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
        alignItems: 'center',
    },
    lastRow: {
        borderBottomWidth: 0,
    },
    tableLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: '#bbb',
        flex: 1,
        minWidth: 120,
    },
    tableValue: {
        fontSize: 15,
        color: '#fff',
        flex: 2,
        textAlign: 'right',
        fontWeight: '400',
    },
    vipText: {
        color: '#fbbf24',
        fontWeight: '600',
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
    helpText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        lineHeight: 16,
        fontStyle: 'italic',
        marginTop: 16,
    },
});

export default TraktAuthScreen;