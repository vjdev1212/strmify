import { Colors } from '@/constants/theme';
import React, { createContext, useContext } from 'react';

type ThemeColors = typeof Colors;

const ThemeContext = createContext<ThemeColors>(Colors);

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => (
    <ThemeContext.Provider value={Colors}>
        {children}
    </ThemeContext.Provider>
);

export const useTheme = () => useContext(ThemeContext);