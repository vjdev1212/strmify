import React, { useState, useRef, useCallback } from 'react';
import { StyleSheet, Animated, ActivityIndicator, Platform } from 'react-native';
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

  const shadowContainerStyle = [
    styles.shadowContainer,
    {
      borderRadius: isPortrait ? 0 : 10,
      // Platform-specific shadows
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.44,
          shadowRadius: 10.32,
        },
        android: {
          elevation: 16,
        },
      }),
    }
  ];

  return (
    <View style={containerStyle}>
      <Animated.View style={shadowContainerStyle}>
        {isLoading && (
          <Animated.View style={styles.loaderContainer}>
            <ActivityIndicator color="#535aff" />
          </Animated.View>
        )}

        <Animated.Image
          resizeMode={isPortrait ? 'cover' : 'contain'}
          source={{ uri: background }}
          style={posterStyle}
          onLoad={startAnimations}
        />
      </Animated.View>
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
  shadowContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
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