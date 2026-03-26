const PRIMARY = '#666666';
const BACKGROUND = '#1a1a1a';

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
    primary: PRIMARY,
    background: BACKGROUND,
    primaryDark: PRIMARY + 'cc',
    primaryMuted: PRIMARY + '40',
    primaryBorder: PRIMARY + '26',
    primarySurface: PRIMARY + '1a',
    primaryCard: PRIMARY + '10',
    primarySubtle: PRIMARY + '0a',
    primaryGhost: PRIMARY + '08',
    primaryFaint: PRIMARY + '05',
    backgroundMid: BACKGROUND + 'cc',
    backgroundCard: BACKGROUND + '99',
    backgroundOverlay: BACKGROUND + '80',
    gradientBg: [BACKGROUND, BACKGROUND + '0d', BACKGROUND] as const,
    gradientOverlay: ['transparent', BACKGROUND + '80', BACKGROUND + 'eb'] as const,
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.75)',
    textDim: 'rgba(255,255,255,0.5)',
    border: PRIMARY + '26',
    borderStrong: PRIMARY + '66',
};