import React, { useState, useEffect } from 'react';
import { Image, StyleSheet, View as RNView, Animated, useColorScheme } from 'react-native';
import { View } from './Themed';

const MediaContentPoster = ({ background, logo }: { background: string, logo: string }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0)); // Fade animation for the background image
  const [titleFadeAnim] = useState(new Animated.Value(0)); // Fade animation for the title
  const colorScheme = useColorScheme(); // Detect color scheme (light or dark)

  useEffect(() => {
    const imageLoader = setTimeout(() => {
      setIsLoading(false);
      // Animate both the background and the title opacity
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
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

  const backgroundColor = colorScheme === 'dark' ? '#0f0f0f' : '#f0f0f0';

  return (
    <>
      <View style={[styles.posterContainer, { backgroundColor }]}>
        {isLoading ? (
          <RNView style={styles.skeletonBackground} />
        ) : (
          <Animated.Image
            source={{ uri: background }}
            style={[styles.poster, { opacity: fadeAnim }]} // Apply animated opacity for background
          />
        )}
      </View>
      
      <Animated.View style={[styles.logoContainer, { opacity: titleFadeAnim }]}>
        <Image source={{ uri: logo }} style={styles.logo} />
      </Animated.View>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default MediaContentPoster;
