import { createMMKV } from 'react-native-mmkv';

// Initialize MMKV storage
const storage = createMMKV({
    id: 'strmify'
});

export const StorageKeys = {
    SERVERS_KEY: 'STRMIFY_SERVERS',
    ADDONS_KEY: 'STRMIFY_ADDONS',
    DEFAULT_MEDIA_PLAYER_KEY: 'STRMIFY_DEFAULT_MEDIA_PLAYER',
    OPENSUBTITLES_API_KEY: 'STRMIFY_OPENSUBTITLES_API_KEY',
    OPENSUBTITLES_USER_AGENT: 'STRMIFY_OPENSUBTITLES_USER_AGENT',
    WATCH_HISTORY_KEY: 'STRMIFY_WATCH_HISTORY_KEY',
    SUBTITLE_LANGUAGES_KEY: 'STRMIFY_SUBTITLE_LANGUAGES_KEY',
    LIBRARY_KEY: 'STRMIFY_LIBRARY_KEY'
} as const;

export const storageService = {
    getItem(key: string): string | undefined {
        try {
            return storage.getString(key);
        } catch (error) {
            console.error('Error reading from MMKV:', error);
            return undefined;
        }
    },

    setItem(key: string, value: string): void {
        try {
            storage.set(key, value);
        } catch (error) {
            console.error('Error writing to MMKV:', error);
            throw error;
        }
    },

    removeItem(key: string): void {
        try {
            storage.remove(key);
        } catch (error) {
            console.error('Error removing from MMKV:', error);
            throw error;
        }
    },

    clear(): void {
        try {
            storage.clearAll();
            console.log('MMKV cleared successfully');
        } catch (error) {
            console.error('Error clearing MMKV:', error);
            throw error;
        }
    },

    isAvailable(): boolean {
        try {
            // Test if MMKV is available by attempting a simple operation
            storage.set('__test__', 'test');
            storage.remove('__test__');
            return true;
        } catch (error) {
            console.error('Error checking MMKV availability:', error);
            return false;
        }
    },

    // Additional helper methods for working with objects
    getObject<T>(key: string): T | undefined {
        try {
            const value = storage.getString(key);
            return value ? JSON.parse(value) : undefined;
        } catch (error) {
            console.error('Error parsing object from MMKV:', error);
            return undefined;
        }
    },

    setObject(key: string, value: any): void {
        try {
            storage.set(key, JSON.stringify(value));
        } catch (error) {
            console.error('Error setting object to MMKV:', error);
            throw error;
        }
    },

    // Type-specific getters for better type safety
    getBoolean(key: string): boolean | undefined {
        try {
            return storage.getBoolean(key);
        } catch (error) {
            console.error('Error reading boolean from MMKV:', error);
            return undefined;
        }
    },

    setBoolean(key: string, value: boolean): void {
        try {
            storage.set(key, value);
        } catch (error) {
            console.error('Error setting boolean to MMKV:', error);
            throw error;
        }
    },

    getNumber(key: string): number | undefined {
        try {
            return storage.getNumber(key);
        } catch (error) {
            console.error('Error reading number from MMKV:', error);
            return undefined;
        }
    },

    setNumber(key: string, value: number): void {
        try {
            storage.set(key, value);
        } catch (error) {
            console.error('Error setting number to MMKV:', error);
            throw error;
        }
    },

    // Get all keys
    getAllKeys(): string[] {
        try {
            return storage.getAllKeys();
        } catch (error) {
            console.error('Error getting all keys from MMKV:', error);
            return [];
        }
    },

    // Check if key exists
    contains(key: string): boolean {
        try {
            return storage.contains(key);
        } catch (error) {
            console.error('Error checking key existence in MMKV:', error);
            return false;
        }
    }
};

// Export the storage instance if direct access is needed
export { storage };