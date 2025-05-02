import React, { useState, useEffect } from 'react';
import { StyleSheet, View as RNView, Animated } from 'react-native';
import { View } from './Themed';

const MediaContentPoster = ({ background, isPortrait }: { background: string, isPortrait: boolean }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [titleFadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const imageLoader = setTimeout(() => {
      setIsLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      Animated.timing(titleFadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 100);

    return () => clearTimeout(imageLoader);
  }, [fadeAnim, titleFadeAnim]);


  return (
    <>
      <View style={[styles.posterContainer, {
        aspectRatio: isPortrait ? 4 / 3 : 16 / 9,
      }]}>
        {isLoading ? (
          <RNView style={styles.skeletonBackground} />
        ) : (
          <Animated.Image
            resizeMode={isPortrait ? 'cover' : 'contain'}
            source={{ uri: background }}
            style={[styles.poster, {
              opacity: fadeAnim,
              aspectRatio: 4 / 3,
              borderRadius: isPortrait ? 0 : 10,
            }]}
          />
        )}
      </View>
    </>
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
