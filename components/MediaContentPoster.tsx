import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { Text, View } from './Themed';

const MediaContentPoster = ({ background, logo }: { background: string, logo: string }) => (
  <>
    <View style={styles.posterContainer}>
      <Image source={{ uri: background }} style={styles.poster} />
    </View>
    <View style={styles.logoContainer}>
      <Image source={{ uri: logo }} style={styles.logo} />
    </View>
  </>
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
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  logoContainer: {
    backgroundColor: 'transparent',
    maxHeight: 50,
    width: 200,    
    margin: 'auto',    
    marginTop: 20
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain'
  }
});

export default MediaContentPoster;