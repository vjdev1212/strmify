import React from 'react';
import { StyleSheet } from 'react-native';
import { Text, View } from './Themed';
import { formatDate, getYear } from '@/utils/Date';


const MediaContentHeader = ({
  name,
  genre,
  released,
  runtime,
  imdbRating,
}: {
  name: string;
  genre: string[];
  released: string;
  runtime: string;
  imdbRating: string;
}) => (
  <View style={styles.container}>
    <Text style={styles.title}>{name}</Text>
    <Text style={styles.genre}>{genre?.join(', ')}</Text>
    <Text style={styles.info}>{getYear(released)}   |   ★ {imdbRating}   |   Runtime: {runtime}</Text>
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
