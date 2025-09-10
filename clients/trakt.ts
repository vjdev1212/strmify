import { webSecureStore } from "@/utils/Web";

export interface TraktTokens {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
    created_at: number;
}

// Trakt.tv API configuration from environment variables
const TRAKT_CLIENT_ID = process.env.EXPO_PUBLIC_TRAKT_CLIENT_ID || '';
const TRAKT_CLIENT_SECRET = process.env.EXPO_PUBLIC_TRAKT_CLIENT_SECRET || '';
const TRAKT_REDIRECT_URI = process.env.EXPO_PUBLIC_TRAKT_REDIRECT_URI || '';
const TRAKT_API_BASE = process.env.EXPO_PUBLIC_TRAKT_API_BASE || 'https://api.trakt.tv';

// Token management functions
export const getTraktTokens = async (): Promise<TraktTokens | null> => {
    try {
        const tokens = await webSecureStore.getItem('trakt_tokens');
        return tokens ? JSON.parse(tokens) : null;
    } catch (error) {
        console.error('Failed to get Trakt tokens:', error);
        return null;
    }
};

export const saveTraktTokens = async (tokens: TraktTokens): Promise<void> => {
    try {
        await webSecureStore.setItem('trakt_tokens', JSON.stringify(tokens));
    } catch (error) {
        console.error('Failed to save Trakt tokens:', error);
        throw error;
    }
};

export const clearTraktTokens = async (): Promise<void> => {
    try {
        await webSecureStore.deleteItem('trakt_tokens');
    } catch (error) {
        console.error('Failed to clear Trakt tokens:', error);
    }
};

// Authentication status functions
export const isUserAuthenticated = async (): Promise<boolean> => {
    try {
        const tokens = await getTraktTokens();
        if (!tokens?.access_token) {
            return false;
        }

        // If token is close to expiring (within 5 minutes), refresh it proactively
        const expiresAt = tokens.created_at + tokens.expires_in;
        const timeUntilExpiry = expiresAt - (Date.now() / 1000);

        if (timeUntilExpiry < 300) { // Less than 5 minutes
            console.log('Token expiring soon, refreshing proactively...');
            const refreshSuccess = await refreshTraktTokens();
            return refreshSuccess;
        }

        // Verify with a lightweight API call
        const response = await fetch(`${TRAKT_API_BASE}/users/settings`, {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'trakt-api-version': '2',
                'trakt-api-key': TRAKT_CLIENT_ID,
            },
        });

        if (response.status === 401) {
            // Token is invalid, try to refresh
            console.log('Got 401 during auth check, attempting refresh...');
            const refreshSuccess = await refreshTraktTokens();
            return refreshSuccess;
        }

        return response.ok;
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
};

export const isTokenExpired = (tokens: TraktTokens): boolean => {
    if (!tokens.created_at || !tokens.expires_in) {
        return true;
    }

    const now = Math.floor(Date.now() / 1000);
    const expirationTime = tokens.created_at + tokens.expires_in;

    // Consider token expired if it expires in the next 5 minutes
    return (expirationTime - now) < 300;
};

export const ensureValidTokens = async (): Promise<boolean> => {
    try {
        const tokens = await getTraktTokens();
        if (!tokens) {
            return false;
        }

        if (isTokenExpired(tokens)) {
            console.log('Tokens expired, attempting refresh...');
            return await refreshTraktTokens();
        }

        return true;
    } catch (error) {
        console.error('Error ensuring valid tokens:', error);
        return false;
    }
};

// Token refresh functionality
export const refreshTraktTokens = async (): Promise<boolean> => {
    try {
        const tokens = await getTraktTokens();
        if (!tokens?.refresh_token) {
            console.log('No refresh token available');
            return false;
        }

        const response = await fetch(`${TRAKT_API_BASE}/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'trakt-api-version': '2',
                'trakt-api-key': TRAKT_CLIENT_ID,
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

            await saveTraktTokens(newTokens);
            console.log('Tokens refreshed successfully');
            return true;
        } else {
            console.error('Failed to refresh tokens:', response.status, await response.text());
            // If refresh fails, clear the invalid tokens
            await clearTraktTokens();
            return false;
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        return false;
    }
};

// Core API call functions
export const makeTraktApiCallUnauthenticated = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    try {
        const response = await fetch(`${TRAKT_API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'trakt-api-version': '2',
                'trakt-api-key': TRAKT_CLIENT_ID,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            throw new Error(`Trakt API error: ${response.status} ${response.statusText}`);
        }

        // Handle empty responses (like from DELETE requests)
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    } catch (error) {
        console.error('Trakt API call failed (unauthenticated):', error);
        throw error;
    }
};

export const makeTraktApiCallAuthenticated = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    try {
        let tokens = await getTraktTokens();
        if (!tokens) {
            throw new Error('User not authenticated');
        }

        // Check if token is expired and refresh if needed
        if (isTokenExpired(tokens)) {
            console.log('Token expired, attempting refresh...');
            const refreshSuccess = await refreshTraktTokens();
            if (!refreshSuccess) {
                throw new Error('Failed to refresh expired token');
            }
            // Get the refreshed tokens
            tokens = await getTraktTokens();
            if (!tokens) {
                throw new Error('Failed to retrieve refreshed tokens');
            }
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
            // If we get 401, try refreshing token once more
            if (response.status === 401) {
                console.log('Got 401, attempting token refresh...');
                const refreshSuccess = await refreshTraktTokens();
                if (refreshSuccess) {
                    // Get the refreshed tokens
                    const refreshedTokens = await getTraktTokens();
                    if (refreshedTokens) {
                        // Retry the request with new token
                        const retryResponse = await fetch(`${TRAKT_API_BASE}${endpoint}`, {
                            ...options,
                            headers: {
                                'Authorization': `Bearer ${refreshedTokens.access_token}`,
                                'trakt-api-version': '2',
                                'trakt-api-key': TRAKT_CLIENT_ID,
                                'Content-Type': 'application/json',
                                ...options.headers,
                            },
                        });

                        if (retryResponse.ok) {
                            const text = await retryResponse.text();
                            return text ? JSON.parse(text) : null;
                        }
                    }
                }
                // If refresh failed, clear tokens
                await clearTraktTokens();
            }

            throw new Error(`Trakt API error: ${response.status} ${response.statusText}`);
        }

        // Handle empty responses (like from DELETE requests)
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    } catch (error) {
        console.error('Trakt API call failed (authenticated):', error);
        throw error;
    }
};

// Safe API call that doesn't throw on unauthenticated users
export const safeMakeTraktApiCall = async (endpoint: string, options: RequestInit = {}): Promise<any | null> => {
    try {
        const isAuth = await isUserAuthenticated();
        if (!isAuth) {
            console.log('User not authenticated, skipping API call to:', endpoint);
            return null;
        }

        return await makeTraktApiCallAuthenticated(endpoint, options);
    } catch (error) {
        console.error('Safe Trakt API call failed:', error);
        return null;
    }
};

// Flexible API call that can handle both authenticated and unauthenticated endpoints
export const makeTraktApiCall = async (
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = true
): Promise<any> => {
    if (requireAuth) {
        return await makeTraktApiCallAuthenticated(endpoint, options);
    } else {
        return await makeTraktApiCallUnauthenticated(endpoint, options);
    }
};

// Helper functions for common use cases
export const shouldShowAuthPrompt = async (): Promise<boolean> => {
    return !(await isUserAuthenticated());
};

export const initializeTraktAuth = async (): Promise<boolean> => {
    const isAuth = await isUserAuthenticated();
    if (!isAuth) {
        console.log('User not authenticated. Need to authenticate first.');
        return false;
    }
    return true;
};

// User info functions
export const getTraktUserInfo = async (): Promise<any | null> => {
    try {
        return await makeTraktApiCallAuthenticated('/users/me');
    } catch (error) {
        console.error('Failed to get user info:', error);
        return null;
    }
};

// Watchlist functions
export const getTraktWatchlist = async (type: 'movies' | 'shows' = 'movies'): Promise<any | null> => {
    try {
        return await makeTraktApiCallAuthenticated(`/users/me/watchlist/${type}`);
    } catch (error) {
        console.error('Failed to get watchlist:', error);
        return null;
    }
};

export const addToTraktWatchlist = async (
    type: 'movies' | 'shows',
    items: any[]
): Promise<boolean> => {
    try {
        const response = await makeTraktApiCallAuthenticated(`/users/me/watchlist`, {
            method: 'POST',
            body: JSON.stringify({ [type]: items }),
        });
        return response !== null;
    } catch (error) {
        console.error('Failed to add to watchlist:', error);
        return false;
    }
};

export const removeFromTraktWatchlist = async (
    type: 'movies' | 'shows',
    items: any[]
): Promise<boolean> => {
    try {
        const response = await makeTraktApiCallAuthenticated(`/users/me/watchlist/remove`, {
            method: 'POST',
            body: JSON.stringify({ [type]: items }),
        });
        return response !== null;
    } catch (error) {
        console.error('Failed to remove from watchlist:', error);
        return false;
    }
};

// Collection functions
export const getTraktCollection = async (type: 'movies' | 'shows' = 'movies'): Promise<any | null> => {
    try {
        return await makeTraktApiCallAuthenticated(`/users/me/collection/${type}`);
    } catch (error) {
        console.error('Failed to get collection:', error);
        return null;
    }
};

// History functions
export const getTraktHistory = async (type?: 'movies' | 'shows'): Promise<any | null> => {
    try {
        const endpoint = type ? `/users/me/history/${type}` : '/users/me/history';
        return await makeTraktApiCallAuthenticated(endpoint);
    } catch (error) {
        console.error('Failed to get history:', error);
        return null;
    }
};

// Scrobble functions (mark as watching/watched)
export const scrobbleStart = async (item: any): Promise<boolean> => {
    try {
        const response = await makeTraktApiCallAuthenticated('/scrobble/start', {
            method: 'POST',
            body: JSON.stringify(item),
        });
        return response !== null;
    } catch (error) {
        console.error('Failed to start scrobble:', error);
        return false;
    }
};

export const scrobbleStop = async (item: any): Promise<boolean> => {
    try {
        const response = await makeTraktApiCallAuthenticated('/scrobble/stop', {
            method: 'POST',
            body: JSON.stringify(item),
        });
        return response !== null;
    } catch (error) {
        console.error('Failed to stop scrobble:', error);
        return false;
    }
};

// Public/trending data (no auth required)
export const getTraktTrending = async (type: 'movies' | 'shows' = 'movies'): Promise<any | null> => {
    try {
        return await makeTraktApiCallUnauthenticated(`/${type}/trending`);
    } catch (error) {
        console.error('Failed to get trending:', error);
        return null;
    }
};

export const getTraktPopular = async (type: 'movies' | 'shows' = 'movies'): Promise<any | null> => {
    try {
        return await makeTraktApiCallUnauthenticated(`/${type}/popular`);
    } catch (error) {
        console.error('Failed to get popular:', error);
        return null;
    }
};

// Search function
export const searchTrakt = async (query: string, type?: 'movie' | 'show' | 'person'): Promise<any | null> => {
    try {
        const typeParam = type ? `&type=${type}` : '';
        return await makeTraktApiCallUnauthenticated(`/search/query?query=${encodeURIComponent(query)}${typeParam}`);
    } catch (error) {
        console.error('Failed to search:', error);
        return null;
    }
};