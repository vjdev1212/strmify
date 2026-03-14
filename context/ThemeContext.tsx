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
  presetId: 'violet',
  primary: '#535aff',
  background: '#0d0b2e',
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

const ThemeContext = createContext<ThemeContextValue>({
  colors: Colors,
  savedTheme: DEFAULT_THEME,
  applyTheme: () => {},
});

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [savedTheme, setSavedTheme] = useState<SavedTheme>(loadSavedTheme);
  const [colors, setColors] = useState<AppColors>(() => buildColors(loadSavedTheme()));

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