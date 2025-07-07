import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View as RNView, Animated } from 'react-native';
import { View } from './Themed';

interface MediaContentPosterProps {
  background: string;
  isPortrait: boolean;
}

const MediaContentPoster: React.FC<MediaContentPosterProps> = ({ background, isPortrait }) => {
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const titleFadeAnim = useRef(new Animated.Value(0)).current;

  const startAnimations = useCallback(() => {
    setIsLoading(false);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(titleFadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, titleFadeAnim]);

  useEffect(() => {
    const imageLoader = setTimeout(startAnimations, 100);
    return () => clearTimeout(imageLoader);
  }, [startAnimations]);

  const containerStyle = [
    styles.posterContainer,
    { aspectRatio: isPortrait ? 4 / 3 : 16 / 9 }
  ];

  const posterStyle = [
    styles.poster,
    {
      opacity: fadeAnim,
      aspectRatio: 4 / 3,
      borderRadius: isPortrait ? 0 : 10,
    }
  ];

  return (
    <View style={containerStyle}>
      {isLoading ? (
        <RNView style={styles.skeletonBackground} />
      ) : (
        <Animated.Image
          resizeMode={isPortrait ? 'cover' : 'contain'}
          source={{ uri: background }}
          style={posterStyle}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  posterContainer: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  skeletonBackground: {
    width: '100%',
    height: '100%',
    opacity: 0.1,
  },
});

export default MediaContentPoster;