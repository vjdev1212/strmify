import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Text, View } from './Themed';
import { getYear } from '@/utils/Date';
import { MaterialIcons, FontAwesome, Feather } from '@expo/vector-icons';
import { useColorScheme } from './useColorScheme';

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
}) => {


  const colorScheme = useColorScheme();
  return (
    <View style={styles.container}>
      {genre?.length > 0 && <Text numberOfLines={1} style={styles.genre}>{genre.join(', ')}</Text>}
      {(released || releaseInfo || imdbRating || runtime) && (
        <View style={styles.infoContainer}>
          {released && (
            <View style={styles.infoItem}>
              <MaterialIcons name="date-range" size={17} color={'#ffffff'} />
              <Text style={styles.infoText}> {getYear(released) || releaseInfo}</Text>
            </View>
          )}
          {released && imdbRating && imdbRating !== "0.0" && <Text style={styles.separator}>|   </Text>}
          {imdbRating && imdbRating !== "0.0"  && (
            <View style={styles.infoItem}>
              <FontAwesome name="imdb" size={15} color={'#ffffff'} />
              <Text style={styles.infoText}>{imdbRating}</Text>
              <FontAwesome name="star-o" size={14} color={'#ffffff'} />
            </View>
          )}
          {(released || imdbRating) && runtime && runtime !== '0' && <Text style={styles.separator}>|   </Text>}
          {runtime && runtime !== '0' && (
            <View style={styles.infoItem}>
              <Feather name="clock" size={14} color={'#ffffff'} />
              <Text style={styles.infoText}>{runtime} mins</Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  genre: {
    fontSize: 16,
    marginBottom: 10,
    paddingBottom: 10
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 5,
    paddingRight: 5
  },
  separator: {
    fontSize: 14,
  },
});

export default MediaContentHeader;