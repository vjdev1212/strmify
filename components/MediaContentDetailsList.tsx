import React from 'react';
import { StyleSheet } from 'react-native';
import { Text, View } from './Themed';

const MediaContentDetailsList = ({
  released,
  country,
  director,
  writer,
  cast,
}: {
  released: string;
  country: string;
  director: string[];
  writer: string[];
  cast: string[];
}) => (
  <View style={styles.container}>
    {released && (
      <>
        <Text style={styles.label}>Released:</Text>
        <Text style={styles.value}>{released}</Text>
      </>
    )}
    {country && (
      <>
        <Text style={styles.label}>Country:</Text>
        <Text style={styles.value}>{country}</Text>
      </>
    )}
    {director?.length > 0 && (
      <>
        <Text style={styles.label}>Directors:</Text>
        <Text style={styles.value}>{director?.join(', ')}</Text>
      </>
    )}
    {writer?.length > 0 && (
      <>
        <Text style={styles.label}>Writers:</Text>
        <Text style={styles.value}>{writer?.join(', ')}</Text>
      </>
    )}
    {cast?.length > 0 && (
      <>
        <Text style={styles.label}>Cast:</Text>
        <Text style={styles.value}>{cast?.join(', ')}</Text>
      </>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  value: {
    fontSize: 14,
    marginBottom: 15,
  },
});

export default MediaContentDetailsList;
