import React, { useState, useRef, useCallback } from 'react';
import { StyleSheet, View as RNView, Animated, ActivityIndicator, Image } from 'react-native';
import { View } from './Themed';

interface MediaContentPosterProps {
  background: string;
  isPortrait: boolean;
}

const MediaContentPoster: React.FC<MediaContentPosterProps> = ({ background, isPortrait }) => {
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const startAnimations = useCallback(() => {
    setIsLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const containerStyle = [
    styles.posterContainer,
    { aspectRatio: isPortrait ? 1 / 1 : 16 / 9 }
  ];

  const posterStyle = [
    styles.poster,
    {
      opacity: fadeAnim,
      borderRadius: isPortrait ? 0 : 10,
    }
  ];

  return (
    <View style={containerStyle}>
      {isLoading && (
        <RNView style={styles.loaderContainer}>
          <ActivityIndicator color="#535aff" />
        </RNView>
      )}

      <Animated.Image
        resizeMode={isPortrait ? 'cover' : 'contain'}
        source={{ uri: background }}
        style={posterStyle}
        onLoad={startAnimations}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  posterContainer: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
});

export default MediaContentPoster;
