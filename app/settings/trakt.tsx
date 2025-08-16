import { SafeAreaView, ScrollView, StyleSheet, Pressable, ActivityIndicator, Linking } from 'react-native';
import { StatusBar, Text, View } from '../../components/Themed';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

// Trakt.tv API configuration from environment variables
const TRAKT_CLIENT_ID = process.env.EXPO_PUBLIC_TRAKT_CLIENT_ID || '';
const TRAKT_CLIENT_SECRET = process.env.EXPO_PUBLIC_TRAKT_CLIENT_SECRET || '';
const TRAKT_REDIRECT_URI = process.env.EXPO_PUBLIC_TRAKT_REDIRECT_URI || '';
const TRAKT_API_BASE = process.env.EXPO_PUBLIC_TRAKT_API_BASE || 'https://api.trakt.tv';

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

interface TraktTokens {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
    created_at: number;
}

const TraktAuthScreen = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [userInfo, setUserInfo] = useState<any>(null);

    useEffect(() => {
        checkAuthStatus();
        
        // Handle deep link when app is opened from background
        const handleDeepLink = (event: { url: string }) => {
            handleAuthRedirect(event.url);
        };

        // Add event listener for deep links
        const subscription = Linking.addEventListener('url', handleDeepLink);

        // Check if app was opened with a deep link
        Linking.getInitialURL().then((url) => {
            if (url) {
                handleAuthRedirect(url);
            }
        });

        return () => {
            subscription?.remove();
        };
    }, []);

    // Handle when screen comes into focus (useful for detecting when user returns from browser)
    useFocusEffect(
        useCallback(() => {
            if (isLoading) {
                // User came back from browser, check if they completed auth
                // The polling will handle the token exchange
            }
        }, [isLoading])
    );

    const handleAuthRedirect = (url: string) => {
        console.log('Received deep link:', url);
        
        // Parse the URL to extract path and parameters
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname; // This will be "/settings/trakt"
            const searchParams = urlObj.searchParams;
            
            console.log('Path:', pathname);
            console.log('Params:', Object.fromEntries(searchParams));
            
            // Check if this is our Trakt auth redirect to settings/trakt
            if (pathname === '/settings/trakt' || url.includes('settings/trakt')) {
                console.log('Trakt auth redirect detected for settings/trakt');
                
                // Extract any parameters Trakt might send back
                const code = searchParams.get('code');
                const state = searchParams.get('state');
                const error = searchParams.get('error');
                
                if (error) {
                    console.error('Auth error:', error);
                    setIsLoading(false);
                    showAlert('Authentication Failed', `Error: ${error}`);
                    return;
                }
                
                if (code) {
                    // If Trakt sends back a code, handle it
                    console.log('Received auth code:', code);
                }
                
                // For device code flow, this redirect confirms user completed the auth
                // The polling mechanism will handle getting the actual token
                showAlert('Authentication', 'Please wait while we complete the authentication...');
                
                // Optionally, you can trigger a re-check of auth status here
                setTimeout(() => {
                    checkAuthStatus();
                }, 2000);
            }
        } catch (error) {
            console.error('Error parsing auth redirect URL:', error);
        }
    };

    const checkAuthStatus = async () => {
        try {
            const tokens = await SecureStore.getItemAsync('trakt_tokens');
            if (tokens) {
                const parsedTokens: TraktTokens = JSON.parse(tokens);
                if (isTokenValid(parsedTokens)) {
                    setIsAuthenticated(true);
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

    const generateDeviceCode = async () => {
        try {
            // Validate configuration first
            if (!validateConfig()) {
                throw new Error('Missing required Trakt.tv configuration. Please check your environment variables.');
            }

            console.log('Attempting to generate device code with client ID:', TRAKT_CLIENT_ID);

            // For web/Expo Go, you need a backend proxy to avoid CORS
            const response = await fetch(`${TRAKT_API_BASE}/oauth/device/code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'trakt-api-version': '2',
                    'trakt-api-key': TRAKT_CLIENT_ID,
                },
                body: JSON.stringify({
                    client_id: TRAKT_CLIENT_ID,
                }),
            });

            console.log('Response status:', response.status, response.statusText);

            if (!response.ok) {
                const errorData = await response.text();
                console.error('API Error Response:', errorData);
                
                if (response.status === 403) {
                    throw new Error('Invalid Trakt.tv client credentials. Please check your EXPO_PUBLIC_TRAKT_CLIENT_ID in your .env file.');
                }
                
                throw new Error(`Failed to generate device code: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error generating device code:', error);
            // If CORS error, show helpful message
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (errorMessage.includes('CORS') || errorMessage.includes('fetch')) {
                showAlert(
                    'Configuration Required', 
                    'This feature requires a backend proxy to work in web browsers. Please set up a backend proxy or use this in a native app build.'
                );
            } else if (errorMessage.includes('credentials') || errorMessage.includes('403')) {
                showAlert('Invalid Credentials', 'Please check your Trakt.tv app credentials in the .env file.');
            } else if (errorMessage.includes('configuration')) {
                showAlert('Configuration Error', errorMessage);
            }
            throw error;
        }
    };

    const pollForToken = async (deviceCode: string, interval: number) => {
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`${TRAKT_API_BASE}/oauth/device/token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        code: deviceCode,
                        client_id: TRAKT_CLIENT_ID,
                        client_secret: TRAKT_CLIENT_SECRET,
                    }),
                });

                if (response.ok) {
                    const tokens: TraktTokens = await response.json();
                    tokens.created_at = Math.floor(Date.now() / 1000);
                    
                    await SecureStore.setItemAsync('trakt_tokens', JSON.stringify(tokens));
                    
                    setIsAuthenticated(true);
                    setIsLoading(false);
                    clearInterval(pollInterval);
                    
                    await fetchUserInfo(tokens.access_token);
                    
                    if (isHapticsSupported()) {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    
                    showAlert('Success', 'Successfully connected to Trakt.tv!');
                } else if (response.status === 400) {
                    // Still waiting for user authorization
                    return;
                } else {
                    throw new Error('Failed to get token');
                }
            } catch (error) {
                console.error('Error polling for token:', error);
                clearInterval(pollInterval);
                setIsLoading(false);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                showAlert('Error', `Failed to authenticate with Trakt.tv: ${errorMessage}`);
            }
        }, interval * 1000);

        // Stop polling after 10 minutes
        setTimeout(() => {
            clearInterval(pollInterval);
            setIsLoading(false);
        }, 600000);
    };

    const authenticateWithTrakt = async () => {
        try {
            setIsLoading(true);
            
            if (isHapticsSupported()) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
            }

            const deviceCodeResponse = await generateDeviceCode();
            
            // Open browser for user authentication
            await Linking.openURL(deviceCodeResponse.verification_url);
            
            showAlert(
                'Authenticate with Trakt.tv',
                `Please visit the opened page and enter this code: ${deviceCodeResponse.user_code}`,
                [{ text: 'OK', onPress: () => {} }]
            );

            // Start polling for token
            await pollForToken(deviceCodeResponse.device_code, deviceCodeResponse.interval);
            
        } catch (error) {
            console.error('Authentication error:', error);
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
                
                await SecureStore.setItemAsync('trakt_tokens', JSON.stringify(newTokens));
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
                setUserInfo(user);
            }
        } catch (error) {
            console.error('Failed to fetch user info:', error);
        }
    };

    const logout = async () => {
        try {
            if (isHapticsSupported()) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
            }

            await SecureStore.deleteItemAsync('trakt_tokens');
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
                        
                        <Text style={styles.userInfoLabel}>Member Since:</Text>
                        <Text style={styles.userInfoValue}>
                            {new Date(userInfo.joined_at).toLocaleDateString()}
                        </Text>
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
                    <Text style={styles.connectButtonText}>Connect to Trakt.tv</Text>
                )}
            </Pressable>
            
            {isLoading && (
                <Text style={styles.loadingText}>
                    Waiting for authorization... Please complete the authentication in your browser
                </Text>
            )}
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
    userInfoContainer: {
        marginTop: 16,
        gap: 12,
    },
    userInfoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#535aff',
    },
    userInfoValue: {
        fontSize: 16,
        color: '#fff',
        marginBottom: 8,
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
        paddingHorizontal: 32,
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
    loadingText: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 20,
    },
});

export default TraktAuthScreen;

// Utility functions to use in other screens
export const getTraktTokens = async (): Promise<TraktTokens | null> => {
    try {
        const tokens = await SecureStore.getItemAsync('trakt_tokens');
        return tokens ? JSON.parse(tokens) : null;
    } catch (error) {
        console.error('Failed to get Trakt tokens:', error);
        return null;
    }
};

export const isUserAuthenticated = async (): Promise<boolean> => {
    try {
        const tokens = await getTraktTokens();
        if (!tokens) return false;
        
        const expiresAt = tokens.created_at + tokens.expires_in;
        return Date.now() / 1000 < expiresAt;
    } catch (error) {
        console.error('Failed to check authentication status:', error);
        return false;
    }
};

export const makeTraktApiCall = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    try {
        const tokens = await getTraktTokens();
        if (!tokens) {
            throw new Error('User not authenticated');
        }

        const response = await fetch(`${TRAKT_API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'trakt-api-version': '2',
                'trakt-api-key': TRAKT_CLIENT_ID,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            throw new Error(`Trakt API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Trakt API call failed:', error);
        throw error;
    }
};