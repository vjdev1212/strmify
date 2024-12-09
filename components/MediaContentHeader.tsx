import React from 'react';
import { StyleSheet } from 'react-native';
import { Text, View } from './Themed';


const MediaContentHeader = ({
  name,
  genre,
  runtime,
  imdbRating,
}: {
  name: string;
  genre: string[];
  runtime: string;
  imdbRating: string;
}) => (
  <View style={styles.container}>
    <Text style={styles.title}>{name}</Text>
    <Text style={styles.genre}>{genre?.join(', ')}</Text>
    <Text style={styles.info}>★ {imdbRating} | Runtime: {runtime}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  genre: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 10,
  },
  info: {
    fontSize: 14,
  },
});

export default MediaContentHeader;
