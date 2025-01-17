import React, { useState, useEffect } from 'react';
import { StyleSheet, View as RNView, Animated, useColorScheme, Platform } from 'react-native';
import { View } from './Themed';

const MediaContentPoster = ({ background, logo }: { background: string; logo: string }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [titleFadeAnim] = useState(new Animated.Value(0));
  const isWeb = Platform.OS === 'web';
  const colorScheme = isWeb ? 'dark' : useColorScheme();

  useEffect(() => {
    const imageLoader = setTimeout(() => {
      setIsLoading(false);
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
            resizeMode="cover"
            source={{ uri: background }}
            style={[styles.poster, { opacity: fadeAnim }]}
          />
        )}
      </View>
      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: titleFadeAnim, alignSelf: isWeb ? 'center' : 'auto' },
        ]}
      >
        <Animated.Image resizeMode="contain" source={{ uri: logo }} style={styles.logo} />
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  posterContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    alignItems: 'center'
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  skeletonBackground: {
    backgroundColor: '#888888',
    width: '100%',
    height: '100%',
    opacity: 0.1,
  },
  logoContainer: {
    marginTop: 20,
    alignItems: 'center'
  },
  logo: {
    width: 200,
    height: 50,
  },
});

export default MediaContentPoster;
