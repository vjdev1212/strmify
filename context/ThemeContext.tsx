import { Colors, AppColors } from '@/constants/theme';
import { storageService, StorageKeys } from '@/utils/StorageService';
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';

export type SavedTheme = {
    presetId: string;
    primary: string;
    background: string;
};

type ThemeContextValue = {
    colors: AppColors;
    savedTheme: SavedTheme;
    applyTheme: (theme: SavedTheme) => void;
};

const DEFAULT_THEME: SavedTheme = {
    presetId: 'dark',
    primary: '#666666',
    background: '#101010',
};

function buildColors(theme: SavedTheme): AppColors {
    const { primary: P, background: BG } = theme;
    return {
        primary:           P,
        background:        BG,
        primaryDark:       P + 'cc',
        primaryMuted:      P + '40',
        primaryBorder:     P + '26',
        primarySurface:    P + '1a',
        primarySubtle:     P + '0a',
        primaryGhost:      P + '08',
        primaryFaint:      P + '05',
        backgroundMid:     BG + 'cc',
        backgroundCard:    BG + '99',
        backgroundOverlay: BG + '80',
        gradientBg:        [BG, BG + 'cc', BG] as const,
        gradientOverlay:   ['transparent', BG + '80', BG + 'eb'] as const,
        text:              '#ffffff',
        textMuted:         'rgba(255,255,255,0.5)',
        textDim:           'rgba(255,255,255,0.25)',
        border:            P + '26',
        borderStrong:      P + '66',
    };
}

function loadSavedTheme(): SavedTheme {
    try {
        return storageService.getObject<SavedTheme>(StorageKeys.THEME_KEY) ?? DEFAULT_THEME;
    } catch {
        return DEFAULT_THEME;
    }
}

// ✅ FIX 1: Read storage once, use it for BOTH the default context value and initial state
const _initialTheme = loadSavedTheme();

const ThemeContext = createContext<ThemeContextValue>({
    colors: buildColors(_initialTheme),   // ✅ was: Colors (always stale static object)
    savedTheme: _initialTheme,
    applyTheme: () => {},
});

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
    // ✅ FIX 2: Single loadSavedTheme() read — both states derived from same value
    const [savedTheme, setSavedTheme] = useState<SavedTheme>(_initialTheme);
    const [colors, setColors] = useState<AppColors>(() => buildColors(_initialTheme));

    const applyTheme = useCallback((theme: SavedTheme) => {
        storageService.setObject(StorageKeys.THEME_KEY, theme);
        setSavedTheme(theme);
        setColors(buildColors(theme));
    }, []);

    return (
        <ThemeContext.Provider value={{ colors, savedTheme, applyTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);

export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
    factory: (colors: AppColors) => T,
): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
}