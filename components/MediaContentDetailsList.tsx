import React from 'react';
import { StyleSheet } from 'react-native';
import { Text, View } from './Themed';
import { formatDate } from '@/utils/Date';

const MediaContentDetailsList = ({
  type = "movie",
  released = 'Unknown',
  country = [],
  languages = [],
  status = 'Unknown',
}: {
  type: string;
  released: string;
  country: string[];
  languages: any[];
  status: string;
}) => (
  <View style={styles.container}>
    <View style={styles.gridContainer}>
      <View style={styles.gridItem}>
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>{type === 'movie' ? 'Released On:' : 'First Aired On'}</Text>
          </View>
          <Text style={styles.value}>{formatDate(released)}</Text>
        </View>
      </View>
      <View style={styles.gridItem}>
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>Status:</Text>
          </View>
          <Text style={styles.value}>{status}</Text>
        </View>
      </View>
      <View style={styles.gridItem}>
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>Country:</Text>
          </View>
          <Text style={styles.value}>{country.length > 0 ? country.join(', ') : 'Unknown'}</Text>
        </View>
      </View>
      <View style={styles.gridItem}>
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>Spoken Languages:</Text>
          </View>
          <Text style={styles.value}>{languages.length > 0 ? languages.map(l => l.english_name).join(', ') : 'Unknown'}</Text>
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
    paddingVertical: 10,
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
  labelContainer: {
    minWidth: 140,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#111111',
    alignSelf: 'flex-start',
  },
  value: {
    fontSize: 13,
    flex: 1,
    paddingHorizontal: 10
  },
});

export default MediaContentDetailsList;
