const PRIMARY    = '#535aff';
const BACKGROUND = '#0d0b2e';

export type AppColors = {
    primary:            string;
    background:         string;
    primaryDark:        string;
    primaryMuted:       string;
    primaryBorder:      string;
    primarySurface:     string;
    backgroundMid:      string;
    backgroundCard:     string;
    backgroundOverlay:  string;
    gradientBg:         readonly [string, string, string];
    gradientOverlay:    readonly [string, string, string];
    text:               string;
    textMuted:          string;
    textDim:            string;
    border:             string;
    borderStrong:       string;
};

export const Colors: AppColors = {
    primary:            PRIMARY,
    background:         BACKGROUND,
    primaryDark:        PRIMARY + 'cc',
    primaryMuted:       PRIMARY + '40',
    primaryBorder:      PRIMARY + '26',
    primarySurface:     PRIMARY + '1a',
    backgroundMid:      BACKGROUND + 'cc',
    backgroundCard:     BACKGROUND + '99',
    backgroundOverlay:  BACKGROUND + '80',
    gradientBg:         [BACKGROUND, BACKGROUND + 'cc', BACKGROUND] as const,
    gradientOverlay:    ['transparent', BACKGROUND + '80', BACKGROUND + 'eb'] as const,
    text:               '#ffffff',
    textMuted:          'rgba(255,255,255,0.5)',
    textDim:            'rgba(255,255,255,0.25)',
    border:             PRIMARY + '26',
    borderStrong:       PRIMARY + '66',
};