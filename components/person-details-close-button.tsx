import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
      <View style={styles.closeIcon} accessibilityElementsHidden>
        <View style={[styles.closeIconStroke, { backgroundColor: color, transform: [{ rotate: '45deg' }] }]} />
        <View style={[styles.closeIconStroke, { backgroundColor: color, transform: [{ rotate: '-45deg' }] }]} />
      </View>
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
    borderCurve: 'continuous',
  },
  fallbackButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(20,20,20,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIconStroke: {
    position: 'absolute',
    width: 22,
    height: 3,
    borderRadius: 2,
  },
});
