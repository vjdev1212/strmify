import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';


export const StorageKeys = {
    TRAKT_ENABLED_KEY: 'STRMIFY_TRAKT_ENABLED',
    TRAKT_TOKENS_KEY: 'STRMIFY_TRAKT_TOKENS',
    SERVERS_KEY: 'STRMIFY_SERVERS',
    ADDONS_KEY: 'STRMIFY_ADDONS',
    DEFAULT_MEDIA_PLAYER_KEY: 'STRMIFY_DEFAULT_MEDIA_PLAYER',
}

// Storage interface for consistent API
interface StorageService {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
    isAvailable(): Promise<boolean>;
}

// SecureStore implementation (iOS/Android)
const secureStorageImpl: StorageService = {
    async getItem(key: string): Promise<string | null> {
        try {
            const value = await SecureStore.getItemAsync(key);
            return value;
        } catch (error) {
            console.error('Error reading from SecureStore:', error);
            return null;
        }
    },

    async setItem(key: string, value: string): Promise<void> {
        try {
            await SecureStore.setItemAsync(key, value);
        } catch (error) {
            console.error('Error writing to SecureStore:', error);
            throw error;
        }
    },

    async removeItem(key: string): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(key);
        } catch (error) {
            console.error('Error removing from SecureStore:', error);
            throw error;
        }
    },

    async clear(): Promise<void> {
        try {
            // Clear all defined storage keys
            const keysToDelete = Object.values(StorageKeys);

            const deletePromises = keysToDelete.map(async (key) => {
                try {
                    await SecureStore.deleteItemAsync(key);
                    console.log(`Cleared key: ${key}`);
                } catch (error) {
                    console.warn(`Failed to clear key ${key}:`, error);
                    // Continue with other keys even if one fails
                }
            });

            // Wait for all deletion operations to complete
            await Promise.all(deletePromises);

            console.log('SecureStore cleared successfully');
        } catch (error) {
            console.error('Error clearing SecureStore:', error);
            throw error;
        }
    },

    async isAvailable(): Promise<boolean> {
        try {
            return await SecureStore.isAvailableAsync();
        } catch (error) {
            console.error('Error checking SecureStore availability:', error);
            return false;
        }
    }
};

// AsyncStorage implementation (Web/fallback)
const asyncStorageImpl: StorageService = {
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

// Main storage service that automatically selects the appropriate implementation
export const storageService = {
    // Private method to get the appropriate storage implementation
    _getStorageImpl(): StorageService {
        // On web, SecureStore is not available, so use AsyncStorage
        if (Platform.OS === 'web') {
            return asyncStorageImpl;
        }

        // On iOS/Android, prefer SecureStore but fallback to AsyncStorage if unavailable
        return secureStorageImpl;
    },

    async getItem(key: string): Promise<string | null> {
        const storage = this._getStorageImpl();

        // If using SecureStore on native platforms, check availability first
        if (Platform.OS !== 'web') {
            const isSecureStoreAvailable = await secureStorageImpl.isAvailable();
            if (!isSecureStoreAvailable) {
                console.warn('SecureStore not available, falling back to AsyncStorage');
                return asyncStorageImpl.getItem(key);
            }
        }

        return storage.getItem(key);
    },

    async setItem(key: string, value: string): Promise<void> {
        const storage = this._getStorageImpl();

        // If using SecureStore on native platforms, check availability first
        if (Platform.OS !== 'web') {
            const isSecureStoreAvailable = await secureStorageImpl.isAvailable();
            if (!isSecureStoreAvailable) {
                console.warn('SecureStore not available, falling back to AsyncStorage');
                return asyncStorageImpl.setItem(key, value);
            }
        }

        return storage.setItem(key, value);
    },

    async removeItem(key: string): Promise<void> {
        const storage = this._getStorageImpl();

        // If using SecureStore on native platforms, check availability first
        if (Platform.OS !== 'web') {
            const isSecureStoreAvailable = await secureStorageImpl.isAvailable();
            if (!isSecureStoreAvailable) {
                console.warn('SecureStore not available, falling back to AsyncStorage');
                return asyncStorageImpl.removeItem(key);
            }
        }

        return storage.removeItem(key);
    },

    async clear(): Promise<void> {
        const storage = this._getStorageImpl();

        // If using SecureStore on native platforms, check availability first
        if (Platform.OS !== 'web') {
            const isSecureStoreAvailable = await secureStorageImpl.isAvailable();
            if (!isSecureStoreAvailable) {
                console.warn('SecureStore not available, falling back to AsyncStorage');
                return asyncStorageImpl.clear();
            }
        }

        return storage.clear();
    },

    // Enhanced SecureStore-specific options (only available on native platforms)
    async setItemWithOptions(key: string, value: string, options?: SecureStore.SecureStoreOptions): Promise<void> {
        if (Platform.OS === 'web') {
            console.warn('SecureStore options not supported on web, using AsyncStorage without options');
            return asyncStorageImpl.setItem(key, value);
        }

        try {
            const isAvailable = await secureStorageImpl.isAvailable();
            if (!isAvailable) {
                console.warn('SecureStore not available, falling back to AsyncStorage (options ignored)');
                return asyncStorageImpl.setItem(key, value);
            }

            await SecureStore.setItemAsync(key, value, options);
        } catch (error) {
            console.error('Error writing to SecureStore with options:', error);
            throw error;
        }
    },

    async getItemWithOptions(key: string, options?: SecureStore.SecureStoreOptions): Promise<string | null> {
        if (Platform.OS === 'web') {
            console.warn('SecureStore options not supported on web, using AsyncStorage without options');
            return asyncStorageImpl.getItem(key);
        }

        try {
            const isAvailable = await secureStorageImpl.isAvailable();
            if (!isAvailable) {
                console.warn('SecureStore not available, falling back to AsyncStorage (options ignored)');
                return asyncStorageImpl.getItem(key);
            }

            const value = await SecureStore.getItemAsync(key, options);
            return value;
        } catch (error) {
            console.error('Error reading from SecureStore with options:', error);
            return null;
        }
    },

    async isAvailable(): Promise<boolean> {
        const storage = this._getStorageImpl();
        return storage.isAvailable();
    },

    // Utility method to check which storage is being used
    getStorageType(): 'SecureStore' | 'AsyncStorage' {
        return Platform.OS === 'web' ? 'AsyncStorage' : 'SecureStore';
    },

    // Method to check if SecureStore is actually available (for native platforms)
    async isSecureStoreAvailable(): Promise<boolean> {
        if (Platform.OS === 'web') return false;
        return secureStorageImpl.isAvailable();
    }
};