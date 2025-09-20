import * as SecureStore from 'expo-secure-store';

// SecureStore functions
export const secureStoreService = {
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
            // SecureStore doesn't have a clear method, so we need to track keys manually
            // or implement a custom solution. This is a basic implementation:
            console.warn('SecureStore does not have a native clear method. Consider implementing key tracking for bulk deletion.');
        } catch (error) {
            console.error('Error clearing SecureStore:', error);
            throw error;
        }
    },

    // Additional SecureStore-specific options
    async setItemWithOptions(key: string, value: string, options?: SecureStore.SecureStoreOptions): Promise<void> {
        try {
            await SecureStore.setItemAsync(key, value, options);
        } catch (error) {
            console.error('Error writing to SecureStore with options:', error);
            throw error;
        }
    },

    async getItemWithOptions(key: string, options?: SecureStore.SecureStoreOptions): Promise<string | null> {
        try {
            const value = await SecureStore.getItemAsync(key, options);
            return value;
        } catch (error) {
            console.error('Error reading from SecureStore with options:', error);
            return null;
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