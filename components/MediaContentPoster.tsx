import React, { useState, useEffect } from 'react';
import { Image, StyleSheet, View as RNView, Animated } from 'react-native';
import { View } from './Themed';

const MediaContentPoster = ({ background, logo }: { background: string, logo: string }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const imageLoader = setTimeout(() => {
      setIsLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }, 100);
    
    return () => clearTimeout(imageLoader);
  }, [fadeAnim]);

  return (
    <>
      <View style={styles.posterContainer}>
        {isLoading ? (
          <RNView style={styles.skeletonBackground} />
        ) : (
          <Animated.Image
            source={{ uri: background }}
            style={[styles.poster, { opacity: fadeAnim }]} // Apply animated opacity
          />
        )}
      </View>
      <View style={styles.logoContainer}>
        <Image source={{ uri: logo }} style={styles.logo} />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  posterContainer: {
    position: 'relative',
    height: 300,
    width: '100%',
  },
  poster: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  skeletonBackground: {
    backgroundColor: '#888888',
    width: '100%',
    height: '100%',
    opacity: 0.1,
  },
  logoContainer: {
    backgroundColor: 'transparent',
    maxHeight: 50,
    width: 200,
    margin: 'auto',
    marginTop: 20,
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});

export default MediaContentPoster;
