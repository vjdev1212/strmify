// ─── Base Colors (only edit these) ────────────────────────────────────────────
const PRIMARY    = '#535aff';
const BACKGROUND = '#0d0b2e';

// ─── Derived Colors ───────────────────────────────────────────────────────────
export const Colors = {
    primary:            PRIMARY,
    background:         BACKGROUND,

    // Derived from primary
    primaryDark:        PRIMARY + 'cc',   // 80%
    primaryMuted:       PRIMARY + '40',   // 25%
    primaryBorder:      PRIMARY + '26',   // 15%
    primarySurface:     PRIMARY + '1a',   // 10%

    // Derived from background
    backgroundMid:      BACKGROUND + 'cc',
    backgroundCard:     BACKGROUND + '99',
    backgroundOverlay:  BACKGROUND + '80',

    // Gradients
    gradientBg:         [BACKGROUND, '#1a1645', BACKGROUND] as const,
    gradientOverlay:    ['transparent', BACKGROUND + '80', BACKGROUND + 'eb'] as const,

    // Text
    text:               '#ffffff',
    textMuted:          'rgba(255,255,255,0.5)',
    textDim:            'rgba(255,255,255,0.25)',

    // Borders
    border:             PRIMARY + '26',
    borderStrong:       PRIMARY + '66',
} as const;