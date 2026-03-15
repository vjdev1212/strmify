import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';

interface BlurGradientBackgroundProps {
    intensity?: number;
    tint?: 'light' | 'dark' | 'default';
    colors?: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    borderRadius?: number;
}

export default function BlurGradientBackground({
    intensity = 40,
    tint = 'dark',
    colors,
    start = { x: 0, y: 0 },
    end = { x: 0, y: 1 },
    borderRadius = 0,
}: BlurGradientBackgroundProps) {
    const { colors: themeColors } = useTheme();
    const gradientColors = colors ?? themeColors.gradientBg;

    return (
        <View
            pointerEvents="none"
            style={[
                StyleSheet.absoluteFill,
                {
                    overflow: 'hidden',
                    borderRadius,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.5,
                    shadowRadius: 24,
                    elevation: 12,
                },
            ]}
        >
            {/* ✅ BlurView is a no-op on web — CSS backdropFilter instead */}
            {Platform.OS === 'web' ? (
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            backdropFilter: `blur(${intensity}px)`,
                            // @ts-ignore
                            WebkitBackdropFilter: `blur(${intensity}px)`,
                        },
                    ]}
                />
            ) : (
                <BlurView
                    intensity={intensity}
                    tint={tint}
                    style={StyleSheet.absoluteFill}
                />
            )}

            <LinearGradient
                colors={gradientColors as any}
                start={start}
                end={end}
                style={StyleSheet.absoluteFill}
            />
            <LinearGradient
                colors={[themeColors.primarySurface, 'rgba(0,0,0,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
        </View>
    );
}