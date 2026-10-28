import { Color } from 'expo-router';
import { Platform } from 'react-native';

const ACCENT = '#777777';
const BACKGROUND = '#000000';
const CARD = '#1C1C1E';
const SECONDARY_CARD = '#2C2C2E';

export const systemDarkBackground = Platform.select({
    ios: Color.ios.systemBackground,
    android: Color.android.dynamic.surface,
    default: BACKGROUND,
})!;

export type AppColors = {
    primary: string;
    background: string;
    primaryCard: string;
    primaryDark: string;
    primaryMuted: string;
    primaryBorder: string;
    primarySurface: string;
    primarySubtle: string;
    primaryGhost: string;
    primaryFaint: string;
    backgroundMid: string;
    backgroundCard: string;
    backgroundOverlay: string;
    gradientBg: readonly [string, string, string];
    gradientOverlay: readonly [string, string, string];
    text: string;
    textMuted: string;
    textDim: string;
    border: string;
    borderStrong: string;
};

export const Colors: AppColors = {
    primary: ACCENT,
    background: BACKGROUND,
    primaryDark: '#0066CC',
    primaryMuted: ACCENT + '33',
    primaryBorder: ACCENT + '4D',
    primarySurface: ACCENT + '1A',
    primaryCard: CARD,
    primarySubtle: SECONDARY_CARD,
    primaryGhost: '#FFFFFF0D',
    primaryFaint: '#FFFFFF08',
    backgroundMid: '#000000CC',
    backgroundCard: CARD,
    backgroundOverlay: '#00000080',
    gradientBg: [BACKGROUND, '#101014', BACKGROUND] as const,
    gradientOverlay: ['transparent', '#00000080', '#000000EB'] as const,
    text: '#ffffff',
    textMuted: '#EBEBF599',
    textDim: '#8E8E93',
    border: '#38383A',
    borderStrong: '#636366',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    mdLg: 20,
    lg: 24,
    xl: 32,
    xxl: 48,
} as const;

export const radius = {
    sm: 10,
    md: 14,
    lg: 20,
    capsule: 999,
} as const;

export const typography = {
    largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' as const, letterSpacing: 0.3 },
    title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: 0.1 },
    headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
    body: { fontSize: 17, lineHeight: 24, fontWeight: '400' as const },
    subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const },
    caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
} as const;