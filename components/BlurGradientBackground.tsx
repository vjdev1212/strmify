import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

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
    colors = [
        'rgba(30, 27, 75, 0.85)',   // deep indigo top
        'rgba(23, 20, 80, 0.90)',   // dark navy middle
        'rgba(15, 12, 60, 0.95)',   // near-black indigo bottom
    ],
    start = { x: 0, y: 0 },
    end = { x: 0, y: 1 },
    borderRadius = 24,
}: BlurGradientBackgroundProps) {
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
            {/* Blur layer */}
            <BlurView
                intensity={intensity}
                tint={tint}
                style={StyleSheet.absoluteFill}
            />

            {/* Deep navy gradient overlay */}
            <LinearGradient
                colors={colors as any}
                start={start}
                end={end}
                style={StyleSheet.absoluteFill}
            />

            {/* Subtle top-left highlight for glass sheen */}
            <LinearGradient
                colors={[
                    'rgba(255, 255, 255, 0.06)',
                    'rgba(255, 255, 255, 0.00)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
        </View>
    );
}