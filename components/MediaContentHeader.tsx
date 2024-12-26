import React from 'react';
import { StyleSheet } from 'react-native';
import { Text, View } from './Themed';
import { getYear } from '@/utils/Date';


const MediaContentHeader = ({
  name,
  genre,
  released,
  releaseInfo,
  runtime,
  imdbRating,
}: {
  name: string;
  genre: string[];
  released: string;
  releaseInfo: string;
  runtime: string;
  imdbRating: string;
}) => (
  <View style={styles.container}>
    {genre?.length > 0 && <Text style={styles.genre}>{genre.join(', ')}</Text>}
    {(released || releaseInfo || imdbRating || runtime) && (
      <Text style={styles.info}>
        {released && `${getYear(released) || releaseInfo}`}
        {released && imdbRating && '   |   '}
        {imdbRating && `★ ${imdbRating}`}
        {(released || imdbRating) && runtime && '   |   '}
        {runtime && `Runtime: ${runtime}`}
      </Text>
    )}
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
    marginBottom: 10,
    fontStyle: 'italic'
  },
  info: {
    fontSize: 14,
    fontStyle: 'italic'
  },
});

export default MediaContentHeader;
