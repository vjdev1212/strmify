import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

const MediaPoster = ({ background }: { background: string }) => (
  <View style={styles.posterContainer}>
    <Image source={{ uri: background }} style={styles.poster} />
    <View style={styles.gradientOverlay} />
  </View>
);

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
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Black shadow
  },
});

export default MediaPoster;
