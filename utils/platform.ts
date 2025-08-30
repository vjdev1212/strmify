import { Alert, AlertButton, Platform } from 'react-native';

export const isHapticsSupported = (): boolean => {
    // if (Platform.OS === 'ios' || Platform.OS === 'android') {
    //     return true;
    // }
    // return false;
    return true;
};

export const isOrientationSupported = (): boolean => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
        return true;
    }
    return false;
};

export const showAlert = (title: string, message: string, buttons? : AlertButton[]) => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.alert(title, message, buttons);
    } else {
        window.alert(`${title}\n\n${message}`);
    }
}

export const confirmAction = async (
  title: string,
  message: string,
  confirmText: string
): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return window.confirm(`${title}\n\n${message}`);
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, style: 'default', onPress: () => resolve(true) },
      ],
      {
        cancelable: true,
        userInterfaceStyle: 'dark'
      }
    );
  });
};

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