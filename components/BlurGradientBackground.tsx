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
}

export default function BlurGradientBackground({
    intensity = 80,
    tint = 'dark',
    colors = ['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.95)'],
    start = { x: 0, y: 0 },
    end = { x: 0, y: 1 },
}: BlurGradientBackgroundProps) {
    return (
        <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
        >
            <BlurView
                intensity={intensity}
                tint={tint}
                style={StyleSheet.absoluteFill}
            />
            <LinearGradient
                colors={colors as any}
                start={start}
                end={end}
                style={StyleSheet.absoluteFill}
            />
        </View>
    );
}