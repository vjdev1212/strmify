import React from 'react';
import { StyleSheet } from 'react-native';
import { Text, View } from './Themed';
import { formatDate } from '@/utils/Date';
import { FontAwesome } from '@expo/vector-icons';

const MediaContentDetailsList = ({
  type = "movie",
  genre = [],
  runtime = "Unknown",
  imdbRating = "Unknown",
  released = 'Unknown',
  country = [],
  languages = [],
  status = 'Unknown',
}: {
  type: string;
  genre: string[];
  runtime: string;
  imdbRating: string;
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
            <Text style={styles.label}>{type === 'movie' ? 'Released On:' : 'Aired On'}</Text>
          </View>
          <Text style={styles.value}>{formatDate(released)}</Text>
        </View>
      </View>
      <View style={styles.gridItem}>
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>IMDB Rating:</Text>
          </View>
          <View style={[styles.value, { flexDirection: 'row', alignItems: 'center' }]}>
            <Text style={styles.infoText}>{imdbRating !== "0.0" ? imdbRating : 'Not Rated'}</Text>
            <FontAwesome name="star-o" size={14} color={'#ffffff'} />
          </View>
        </View>
      </View>
      <View style={styles.gridItem}>
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>Genre:</Text>
          </View>
          <Text style={styles.value}>{genre.length > 0 ? genre.join(', ') : 'Unknown'}</Text>
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
            <Text style={styles.label}>Runtime:</Text>
          </View>
          <Text style={styles.value}>{runtime !== '0' ? runtime : 'Unknown'} mins</Text>
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
            <Text style={styles.label}>Languages:</Text>
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
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelContainer: {
    minWidth: 90,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 13,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  value: {
    fontSize: 13,
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 5,
    paddingRight: 5
  },
});

export default MediaContentDetailsList;
