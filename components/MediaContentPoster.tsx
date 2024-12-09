import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { Text, View } from './Themed';

const MediaContentPoster = ({ background }: { background: string }) => (
  <View style={styles.posterContainer}>
    <Image source={{ uri: background }} style={styles.poster} />
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
  }
});

export default MediaContentPoster;