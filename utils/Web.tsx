
import * as Clipboard from 'expo-clipboard';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

const isWeb = Platform.OS === 'web';

// Web-compatible clipboard
export const webClipboard = {
    setString: async (text: string) => {
        if (isWeb && navigator.clipboard) {
            await navigator.clipboard.writeText(text);
        } else if (isWeb) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        } else {
            await Clipboard.setStringAsync(text);
        }
    }
};

// Web-compatible link opening
export const webLinking = {
    openURL: async (url: string) => {
        if (isWeb) {
            window.open(url, '_blank');
        } else {
            await Linking.openURL(url);
        }
    },
    
    addEventListener: (type: 'url', handler: (event: any) => void) => {
        if (isWeb) {
            // For web, we'll handle this differently since we can't intercept browser navigation
            return { remove: () => {} };
        } else {
            return Linking.addEventListener(type, handler);
        }
    },
    
    getInitialURL: async (): Promise<string | null> => {
        if (isWeb) {
            // Check current URL for auth parameters
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('code') || urlParams.has('error')) {
                return window.location.href;
            }
            return null;
        } else {
            return await Linking.getInitialURL();
        }
    }
};
