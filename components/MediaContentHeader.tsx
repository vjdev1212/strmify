import React from 'react';
import { Platform, StyleSheet, useColorScheme } from 'react-native';
import { Text, View } from './Themed';
import { getYear } from '@/utils/Date';
import { MaterialIcons, FontAwesome, Feather } from '@expo/vector-icons';

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

  const isWeb = Platform.OS === 'web';
  const colorScheme = isWeb ? 'dark' : useColorScheme();

  return (
    <View style={styles.container}>
      {genre?.length > 0 && <Text numberOfLines={1} style={styles.genre}>{genre.join(', ')}</Text>}
      {(released || releaseInfo || imdbRating || runtime) && (
        <View style={styles.infoContainer}>
          {released && (
            <View style={styles.infoItem}>
              <MaterialIcons name="date-range" size={17} color={colorScheme === 'dark' ? '#ffffff' : '#000000'} />
              <Text style={styles.infoText}> {getYear(released) || releaseInfo}</Text>
            </View>
          )}
          {released && imdbRating && <Text style={styles.separator}>|   </Text>}
          {imdbRating && (
            <View style={styles.infoItem}>
              <FontAwesome name="imdb" size={15} color={colorScheme === 'dark' ? '#ffffff' : '#000000'} />
              <Text style={styles.infoText}> {imdbRating}</Text>
            </View>
          )}
          {(released || imdbRating) && runtime && <Text style={styles.separator}>|   </Text>}
          {runtime && (
            <View style={styles.infoItem}>
              <Feather name="clock" size={14} color={colorScheme === 'dark' ? '#ffffff' : '#000000'} />
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
  },
  separator: {
    fontSize: 14,
  },
});

export default MediaContentHeader;