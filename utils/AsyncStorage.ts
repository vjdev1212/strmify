import AsyncStorage from "@react-native-async-storage/async-storage";

// AsyncStorage functions
export const asyncStorageService = {
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
    }
};
