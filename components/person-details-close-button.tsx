import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';

interface PersonDetailsCloseButtonProps {
  onPress: () => void;
  color: string;
}

export default function PersonDetailsCloseButton({ onPress, color }: PersonDetailsCloseButtonProps) {
  const content = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close cast and crew details"
      onPress={onPress}
      style={styles.pressable}
      hitSlop={8}
    >
      <Ionicons name="close" size={22} color={color} />
    </Pressable>
  );

  if (isLiquidGlassAvailable() && isGlassEffectAPIAvailable()) {
    return (
      <GlassView
        glassEffectStyle="clear"
        isInteractive
        style={styles.glassButton}
      >
        {content}
      </GlassView>
    );
  }

  return (
    <View style={styles.fallbackButton}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  glassButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  fallbackButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(20,20,20,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
