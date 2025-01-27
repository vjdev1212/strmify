import { Platform, useColorScheme, useWindowDimensions } from "react-native";

export const isPortrait = () => {
    const { width, height } = useWindowDimensions();
    const isPortrait = height > width;
    return isPortrait
}

export const getColorScheme = () => {
    const isWeb = Platform.OS === 'web';
    const colorScheme = isWeb ? 'dark' : useColorScheme();
    return colorScheme;
}