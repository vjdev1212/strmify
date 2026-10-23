import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

interface PosterArtworkProps {
  children?: ReactNode;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

const PosterArtwork = ({ children, borderRadius = 12, style }: PosterArtworkProps) => (
  <View style={[styles.frame, { borderRadius }, style]}>
    {children}
    <View pointerEvents="none" style={[styles.edge, { borderRadius }]} />
  </View>
);

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  edge: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderCurve: 'continuous',
  },
});

export default PosterArtwork;
