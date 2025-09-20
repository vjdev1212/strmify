import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
    TRAKT_ENABLED_KEY: 'STRMIFY_TRAKT_ENABLED',
    TRAKT_TOKENS_KEY: 'STRMIFY_TRAKT_TOKENS',
    SERVERS_KEY: 'STRMIFY_SERVERS',
    ADDONS_KEY: 'STRMIFY_ADDONS',
    DEFAULT_MEDIA_PLAYER_KEY: 'STRMIFY_DEFAULT_MEDIA_PLAYER',
}

export const storageService = {
    async getItem(key: string): Promise<string | null> {
        try {
            const value = await AsyncStorage.getItem(key);
            return value;
        } catch (error) {
            console.error('Error reading from AsyncStorage:', error);
            return null;
        }
    },

    async setItem(key: string, value: string): Promise<void> {
        try {
            await AsyncStorage.setItem(key, value);
        } catch (error) {
            console.error('Error writing to AsyncStorage:', error);
            throw error;
        }
    },

    async removeItem(key: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(key);
        } catch (error) {
            console.error('Error removing from AsyncStorage:', error);
            throw error;
        }
    },

    async clear(): Promise<void> {
        try {
            await AsyncStorage.clear();
            console.log('AsyncStorage cleared successfully');
        } catch (error) {
            console.error('Error clearing AsyncStorage:', error);
            throw error;
        }
    },

    async isAvailable(): Promise<boolean> {
        try {
            // AsyncStorage is generally available on all platforms where React Native runs
            return true;
        } catch (error) {
            console.error('Error checking AsyncStorage availability:', error);
            return false;
        }
    }
};