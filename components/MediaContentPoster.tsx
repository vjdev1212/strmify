import React, { useState, useRef, useCallback } from 'react';
import { StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { View } from './Themed';
import { useTheme } from '@/context/ThemeContext';
import { radius } from '@/constants/theme';

interface MediaContentPosterProps { background: string; isPortrait: boolean; }

const MediaContentPoster: React.FC<MediaContentPosterProps> = ({ background, isPortrait }) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const startAnimations = useCallback(() => {
    setIsLoading(false);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  return (
    <View style={[styles.posterContainer, { aspectRatio: isPortrait ? 1 / 1 : 16 / 9 }]}>
      <Animated.View style={[styles.shadowContainer, { borderRadius: isPortrait ? 0 : radius.md }]}>
        {isLoading && (
          <Animated.View style={styles.loaderContainer}>
            <ActivityIndicator color={colors.primary} />
          </Animated.View>
        )}
        <Animated.Image
          resizeMode={isPortrait ? 'cover' : 'contain'}
          source={{ uri: background }}
          style={[styles.poster, { opacity: fadeAnim, borderRadius: isPortrait ? 0 : radius.md }]}
          onLoad={startAnimations}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  posterContainer: { position: 'relative', width: '100%', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  shadowContainer: { width: '100%', height: '100%', backgroundColor: 'transparent', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.24)' },
  poster: { width: '100%', height: '100%' },
  loaderContainer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
});

export default MediaContentPoster;