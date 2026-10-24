import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

interface PosterArtworkProps {
  children?: (onImageLoad: () => void) => ReactNode;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

const PosterArtwork = ({ children, borderRadius = 12, style }: PosterArtworkProps) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  return (
    <View style={[styles.frame, { borderRadius }, style]}>
      {children?.(() => setIsImageLoaded(true))}
      {isImageLoaded && <View pointerEvents="none" style={[styles.edge, { borderRadius }]} />}
    </View>
  );
};

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
