import React from 'react';
import { StyleSheet } from 'react-native';
import { Text, View } from './Themed';
import { formatDate } from '@/utils/Date';

const MediaContentDetailsList = ({
  released = 'Unknown',
  country = [],
  languages = [],
  status = 'Unknown',
}: {
  released: string;
  country: string[];
  languages: any[];
  status: string;
}) => (
  <View style={styles.container}>
    <View style={styles.gridContainer}>
      <View style={styles.gridItem}>
        <View style={styles.row}>
          <Text style={styles.label}>Released On:</Text>
          <Text style={styles.value}>{formatDate(released)}</Text>
        </View>
      </View>
      <View style={styles.gridItem}>
        <View style={styles.row}>
          <Text style={styles.label}>Country:</Text>
          <Text style={styles.value}>{country.length > 0 ? country.join(', ') : 'Unknown'}</Text>
        </View>
      </View>
      <View style={styles.gridItem}>
        <View style={styles.row}>
          <Text style={styles.label}>Languages:</Text>
          <Text style={styles.value}>{languages.length > 0 ? languages.map(l => l.english_name).join(', ') : 'Unknown'}</Text>
        </View>
      </View>
      <View style={styles.gridItem}>
        <View style={styles.row}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{status}</Text>
        </View>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    minWidth: 300,
    borderRadius: 8,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,    
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#111111'
  },
  value: {
    fontSize: 12,
    flex: 1,
    paddingHorizontal: 10
  },
});

export default MediaContentDetailsList;
