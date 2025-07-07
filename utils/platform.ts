import { Alert, Platform } from 'react-native';

export const isHapticsSupported = (): boolean => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
        return true;
    }
    return false;
};

export const isOrientationSupported = (): boolean => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
        return true;
    }
    return false;
};

export const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.alert(title, message);
    } else {
        window.alert(`${title}\n\n${message}`);
    }
}

export const getOriginalPlatform = () => {
    if (Platform.OS !== 'web') {
        return Platform.OS;
    }

    const userAgent = navigator.userAgent || navigator.vendor || '';

    if (/iPad|iPhone|iPod/.test(userAgent)) {
        return 'ios';
    }

    if (/android/i.test(userAgent)) {
        return 'android';
    }

    if (/Macintosh|Mac OS X/.test(userAgent) && !/iPhone|iPad|iPod/.test(userAgent)) {
        return 'macos';
    }

    if (/Windows NT/.test(userAgent)) {
        return 'windows';
    }

    return 'web';
};