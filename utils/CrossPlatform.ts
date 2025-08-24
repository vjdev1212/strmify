import { Alert, Platform } from "react-native";

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
          { text: confirmText, style: 'destructive', onPress: () => resolve(true) },
        ]
      );
    });
  };