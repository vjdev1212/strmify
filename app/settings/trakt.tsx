import { ScrollView, StyleSheet, Pressable, ActivityIndicator, Platform, Switch } from 'react-native';
import { StatusBar, Text, View } from '../../components/Themed';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { webLinking } from '@/utils/Web';
import { clearTraktTokens, getTraktTokens, getTraktUserInfo, isUserAuthenticated, saveTraktTokens, TraktTokens } from '@/clients/trakt';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storageService } from '@/utils/StorageService';

// Storage key for Trakt enable preference
const TRAKT_ENABLED_KEY = '@trakt_enabled';

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
    const [isTraktEnabled, setIsTraktEnabled] = useState<boolean>(true);

    useEffect(() => {
        initializeAuth();
        loadTraktEnabledState();
    }, []);

    const loadTraktEnabledState = async () => {
        try {
            const stored = await storageService.getItem(TRAKT_ENABLED_KEY);
            if (stored !== null) {
                setIsTraktEnabled(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Failed to load Trakt enabled state:', error);
        }
    };

    const saveTraktEnabledState = async (enabled: boolean) => {
        try {
            await storageService.setItem(TRAKT_ENABLED_KEY, JSON.stringify(enabled));
        } catch (error) {
            console.error('Failed to save Trakt enabled state:', error);
        }
    };

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
                const errorData = await response.json().catch(() => ({}));
                console.error('Token exchange failed:', response.status, errorData);
                
                // Check if tokens were saved despite the error response
                const savedTokens = await getTraktTokens();
                if (savedTokens && savedTokens.access_token) {
                    console.log('Tokens found despite exchange error - likely successful');
                    setIsAuthenticated(true);
                    await fetchUserInfo();
                    showAlert('Success', 'Successfully connected to Trakt.tv!');
                } else {
                    throw new Error(`Failed to exchange code for tokens: ${errorData.error || response.status}`);
                }
            }
        } catch (error) {
            console.error('Token exchange error:', error);
            
            // Final check: see if tokens exist (authentication might have succeeded)
            try {
                const savedTokens = await getTraktTokens();
                if (savedTokens && savedTokens.access_token) {
                    console.log('Authentication appears successful despite error - tokens found');
                    setIsAuthenticated(true);
                    await fetchUserInfo();
                    showAlert('Success', 'Successfully connected to Trakt.tv!');
                    return;
                }
            } catch (checkError) {
                console.error('Error checking for saved tokens:', checkError);
            }
            
            // Only show error if authentication actually failed
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
                // If we were loading and now we're authenticated, stop loading
                if (isLoading) {
                    setIsLoading(false);
                }
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

    const toggleTraktIntegration = async (enabled: boolean) => {
        try {
            if (!isWeb && isHapticsSupported()) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }

            setIsTraktEnabled(enabled);
            await saveTraktEnabledState(enabled);

            if (!enabled) {
                // If disabling, disconnect from Trakt as well
                if (isAuthenticated) {
                    await logout();
                }
                showAlert('Trakt Integration Disabled', 'Trakt.tv integration has been disabled. Re-open the app to reflect the changes.');
            } else {
                showAlert('Trakt Integration Enabled', 'Trakt.tv integration is now enabled. Re-open the app to reflect the changes.');
            }
        } catch (error) {
            console.error('Toggle error:', error);
            // Revert the toggle state if there's an error
            setIsTraktEnabled(!enabled);
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

    const renderToggleSection = () => (
        <View style={styles.toggleSection}>
            <View style={styles.toggleContainer}>
                <View style={styles.toggleInfo}>
                    <Text style={styles.toggleTitle}>Trakt.tv Integration</Text>
                    <Text style={styles.toggleSubtitle}>
                        {isTraktEnabled 
                            ? 'Sync your watched history and ratings with Trakt.tv'
                            : 'Enable to sync with Trakt.tv'
                        }
                    </Text>
                </View>
                <Switch
                    value={isTraktEnabled}
                    onValueChange={toggleTraktIntegration}
                    trackColor={{ false: '#3a3a3a', true: '#535aff40' }}
                    thumbColor={isTraktEnabled ? '#535aff' : '#888'}
                    ios_backgroundColor="#3a3a3a"
                    style={styles.switch}
                />
            </View>
        </View>
    );

    const renderAuthenticatedView = () => (
        <>
            {renderToggleSection()}

            {isTraktEnabled && (
                <>
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.statusIndicator}>
                                <View style={styles.connectedDot} />
                                <Text style={styles.sectionTitle}>Connected</Text>
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
                        <Text style={styles.logoutButtonText}>Disconnect Account</Text>
                    </Pressable>
                </>
            )}

            {!isTraktEnabled && (
                <View style={styles.disabledContainer}>
                    <View style={styles.disabledIcon}>
                        <Text style={styles.disabledIconText}>📱</Text>
                    </View>
                    <Text style={styles.disabledTitle}>Trakt Integration Disabled</Text>
                    <Text style={styles.disabledSubtitle}>
                        Enable the toggle above to connect your Trakt.tv account and start syncing your watch history.
                    </Text>
                </View>
            )}
        </>
    );

    const renderUnauthenticatedView = () => (
        <>
            {renderToggleSection()}

            {isTraktEnabled ? (
                <>
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Connect to Trakt.tv</Text>
                            <Text style={styles.sectionSubtitle}>
                                Connect your Trakt.tv account to sync your watched history, ratings, and collections
                            </Text>
                        </View>

                        <View style={styles.featureList}>
                            <View style={styles.featureItem}>
                                <View style={styles.featureDot} />
                                <Text style={styles.featureText}>Sync watched episodes and movies</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <View style={styles.featureDot} />
                                <Text style={styles.featureText}>Access your ratings and reviews</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <View style={styles.featureDot} />
                                <Text style={styles.featureText}>Manage your watchlist</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <View style={styles.featureDot} />
                                <Text style={styles.featureText}>View your collection</Text>
                            </View>
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
                            <View style={styles.buttonContent}>
                                <ActivityIndicator color="#fff" size="small" />
                                <Text style={styles.connectButtonText}>Connecting...</Text>
                            </View>
                        ) : (
                            <Text style={styles.connectButtonText}>
                                Connect to Trakt.tv
                            </Text>
                        )}
                    </Pressable>

                    {isLoading && !isWeb && (
                        <Text style={styles.helpText}>
                            Complete authentication in your browser to continue
                        </Text>
                    )}
                </>
            ) : (
                <View style={styles.disabledContainer}>
                    <View style={styles.disabledIcon}>
                        <Text style={styles.disabledIconText}>🔒</Text>
                    </View>
                    <Text style={styles.disabledTitle}>Trakt Integration Disabled</Text>
                    <Text style={styles.disabledSubtitle}>
                        Enable Trakt.tv integration above to connect your account and sync your watch history, ratings, and collections.
                    </Text>
                </View>
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
    toggleSection: {
        marginBottom: 32,
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    toggleInfo: {
        flex: 1,
        marginRight: 16,
    },
    toggleTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    toggleSubtitle: {
        fontSize: 14,
        color: '#888',
        lineHeight: 18,
    },
    switch: {
        transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
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
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#888',
        lineHeight: 20,
        marginTop: 4,
    },
    featureList: {
        marginTop: 20,
        gap: 12,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 4,
    },
    featureDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#535aff',
        marginRight: 16,
    },
    featureText: {
        fontSize: 15,
        color: '#ccc',
        lineHeight: 20,
        flex: 1,
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
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2a2a2a',
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
        paddingHorizontal: 24,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#535aff',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
        alignSelf: 'center',
        minWidth: 200,
    },
    logoutButton: {
        backgroundColor: '#ff4757',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#ff4757',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
        alignSelf: 'center',
        minWidth: 180,
    },
    buttonPressed: {
        transform: [{ scale: 0.98 }],
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    connectButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    helpText: {
        fontSize: 13,
        color: '#666',
        textAlign: 'center',
        lineHeight: 18,
        fontStyle: 'italic',
        marginTop: 16,
        paddingHorizontal: 20,
    },
    disabledContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        marginTop: 20,
    },
    disabledIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#2a2a2a',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    disabledIconText: {
        fontSize: 24,
    },
    disabledTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#888',
        textAlign: 'center',
        marginBottom: 8,
    },
    disabledSubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 20,
    },
});

export default TraktAuthScreen;