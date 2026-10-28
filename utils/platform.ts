import { Alert, type AlertButton, Platform } from 'react-native';

export interface NativeAlertDialogRequest {
  id: number;
  title: string;
  message: string;
  buttons: AlertButton[];
  onDismiss?: () => void;
}

type NativeAlertDialogListener = () => void;

let activeNativeAlertDialog: NativeAlertDialogRequest | null = null;
let queuedNativeAlertDialogs: NativeAlertDialogRequest[] = [];
let nativeAlertDialogId = 0;
const nativeAlertDialogListeners = new Set<NativeAlertDialogListener>();

const notifyNativeAlertDialogListeners = () => {
  nativeAlertDialogListeners.forEach((listener) => listener());
};

const enqueueNativeAlertDialog = (
  request: Omit<NativeAlertDialogRequest, 'id'>,
) => {
  const dialog = { ...request, id: ++nativeAlertDialogId };
  if (activeNativeAlertDialog) {
    queuedNativeAlertDialogs = [...queuedNativeAlertDialogs, dialog];
  } else {
    activeNativeAlertDialog = dialog;
  }
  notifyNativeAlertDialogListeners();
};

export const subscribeToNativeAlertDialogs = (listener: NativeAlertDialogListener) => {
  nativeAlertDialogListeners.add(listener);
  return () => {
    nativeAlertDialogListeners.delete(listener);
  };
};

export const getActiveNativeAlertDialog = () => activeNativeAlertDialog;

export const completeNativeAlertDialog = (id: number, buttonIndex?: number) => {
  const completedDialog = activeNativeAlertDialog;
  if (!completedDialog || completedDialog.id !== id) return;

  activeNativeAlertDialog = queuedNativeAlertDialogs[0] ?? null;
  queuedNativeAlertDialogs = queuedNativeAlertDialogs.slice(1);

  if (buttonIndex === undefined) {
    completedDialog.onDismiss?.();
  } else {
    completedDialog.buttons[buttonIndex]?.onPress?.();
  }
  notifyNativeAlertDialogListeners();
};

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

export const showAlert = (title: string, message: string, buttons?: AlertButton[]) => {
  if (Platform.OS === 'ios') {
    enqueueNativeAlertDialog({
      title,
      message,
      buttons: buttons?.length ? buttons : [{ text: 'OK' }],
    });
  } else if (Platform.OS === 'android') {
    Alert.alert(title, message, buttons, { userInterfaceStyle: 'dark', cancelable: true });
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

  if (Platform.OS === 'ios') {
    return new Promise((resolve) => {
      enqueueNativeAlertDialog({
        title,
        message,
        buttons: [
          { text: confirmText, style: 'destructive', onPress: () => resolve(true) },
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        ],
        onDismiss: () => resolve(false),
      });
    });
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