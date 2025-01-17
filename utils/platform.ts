import { Platform } from 'react-native';

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
