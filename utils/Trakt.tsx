
import { webSecureStore } from './Web';

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

export const getTraktTokens = async (): Promise<TraktTokens | null> => {
    try {
        const tokens = await webSecureStore.getItem('trakt_tokens');
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