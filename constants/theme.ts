import { Color } from 'expo-router';
import { Platform } from 'react-native';

export {
    Colors,
    DarkColors,
    LightColors,
    radius,
    spacing,
    systemDarkBackground,
    typography,
} from '@vjdev1212/media-ui-kit';
export type { AppColors } from '@vjdev1212/media-ui-kit';

const settingsAccent = {
    blue: '#007AFF',
    purple: '#AF52DE',
    orange: '#FF9500',
    green: '#34C759',
    teal: '#30B0C7',
    pink: '#FF2D55',
    gray: '#8E8E93',
    red: '#FF3B30',
    googleGreen: '#34A853',
    coffee: '#A2845E',
} as const;

export const settingsIconColors = {
    addOns: settingsAccent.purple,
    mediaPlayer: settingsAccent.blue,
    appearance: settingsAccent.teal,
    stremio: settingsAccent.orange,
    subtitles: settingsAccent.teal,
    downloads: settingsAccent.green,
    contact: settingsAccent.orange,
    disclaimer: settingsAccent.blue,
    donate: settingsAccent.pink,
    version: settingsAccent.blue,
    action: settingsAccent.blue,
    success: settingsAccent.green,
    warning: settingsAccent.orange,
    neutral: settingsAccent.gray,
    danger: settingsAccent.red,
    share: settingsAccent.blue,
    configure: settingsAccent.purple,
    refresh: settingsAccent.orange,
    apple: settingsAccent.gray,
    googlePlay: settingsAccent.googleGreen,
    sideStore: settingsAccent.blue,
    altStore: settingsAccent.purple,
    coffee: settingsAccent.coffee,
} as const;

export const settingsActionBlue = settingsIconColors.action;

export const systemSelectionBlue = Platform.select({
    ios: Color.ios.systemBlue,
    android: Color.android.dynamic.primary,
    default: settingsAccent.blue,
})!;

export const systemSeparatorGray = Platform.select({
    ios: Color.ios.separator,
    android: Color.android.dynamic.outlineVariant,
    default: settingsAccent.gray,
})!;