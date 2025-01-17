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