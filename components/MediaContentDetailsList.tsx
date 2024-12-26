import React from 'react';
import { StyleSheet } from 'react-native';
import { Text, View } from './Themed';
import { formatDate } from '@/utils/Date';

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
      <View style={styles.row}>
        <Text style={styles.label}>Released:</Text>
        <Text style={styles.value}>{formatDate(released)}</Text>
      </View>
    )}
    {country && (
      <View style={styles.row}>
        <Text style={styles.label}>Country:</Text>
        <Text style={styles.value}>{country}</Text>
      </View>
    )}
    {director?.length > 0 && (
      <View style={styles.row}>
        <Text style={styles.label}>Directors:</Text>
        <Text style={styles.value}>{director?.join(', ')}</Text>
      </View>
    )}
    {writer?.length > 0 && (
      <View style={styles.row}>
        <Text style={styles.label}>Writers:</Text>
        <Text style={styles.value}>{writer?.join(', ')}</Text>
      </View>
    )}
    {cast?.length > 0 && (
      <View style={styles.row}>
        <Text style={styles.label}>Cast:</Text>
        <Text style={styles.value}>{cast?.join(', ')}</Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  value: {
    fontSize: 14,
    flex: 3,
    fontStyle: 'italic'
  },
});

export default MediaContentDetailsList;
