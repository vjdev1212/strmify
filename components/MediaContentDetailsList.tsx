import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Text, View } from './Themed';
import { formatDate } from '@/utils/Date';
import { FontAwesome } from '@expo/vector-icons';

// Type definitions
interface Language {
  english_name: string;
}

interface MediaContentDetailsListProps {
  type?: 'movie' | 'tv';
  genre?: string[];
  runtime?: string;
  imdbRating?: string;
  released?: string;
  country?: string[];
  languages?: Language[];
}

// Constants
const UNKNOWN_TEXT = 'Unknown';
const NOT_RATED_TEXT = 'Not Rated';
const STAR_COLOR = '#ffffff';
const STAR_SIZE = 13;

const MediaContentDetailsList: React.FC<MediaContentDetailsListProps> = ({
  type = 'movie',
  genre = [],
  runtime = UNKNOWN_TEXT,
  imdbRating = UNKNOWN_TEXT,
  released = UNKNOWN_TEXT,
  country = [],
  languages = [],
}) => {
  // Memoized computed values
  const computedValues = useMemo(() => {
    const isMovie = type === 'movie';
    const hasRating = imdbRating !== '0.0' && imdbRating !== UNKNOWN_TEXT;
    const formattedDate = formatDate(released);
    const genreText = genre.length > 0 ? genre.join(', ') : UNKNOWN_TEXT;
    const countryText = country.length > 0 ? country.join(', ') : UNKNOWN_TEXT;
    const languagesText = languages.length > 0 
      ? languages.map(l => l.english_name).join(', ') 
      : UNKNOWN_TEXT;
    const runtimeText = runtime !== '0' ? `${runtime} mins` : `${UNKNOWN_TEXT} mins`;
    const ratingText = hasRating ? imdbRating : NOT_RATED_TEXT;
    
    return {
      isMovie,
      hasRating,
      formattedDate,
      genreText,
      countryText,
      languagesText,
      runtimeText,
      ratingText,
      releasedLabel: isMovie ? 'Released On:' : 'First Aired On:',
    };
  }, [type, genre, runtime, imdbRating, released, country, languages]);

  // Render helper for grid items
  const renderGridItem = (label: string, value: string | React.ReactNode, key: string) => (
    <View key={key} style={styles.gridItem}>
      <View style={styles.row}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
        </View>
        {typeof value === 'string' ? (
          <Text numberOfLines={1} style={styles.value}>{value}</Text>
        ) : (
          value
        )}
      </View>
    </View>
  );

  // Render IMDB rating with star
  const renderRatingValue = () => (
    <View style={[styles.value, styles.ratingContainer]}>
      <Text style={styles.infoText}>{computedValues.ratingText}</Text>
      {computedValues.hasRating && (
        <FontAwesome name="star" size={STAR_SIZE} color={STAR_COLOR} />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.gridContainer}>
        {renderGridItem(computedValues.releasedLabel, computedValues.formattedDate, 'released')}
        {renderGridItem('IMDB Rating:', renderRatingValue(), 'rating')}
        {renderGridItem('Genre:', computedValues.genreText, 'genre')}
        {computedValues.isMovie && renderGridItem('Runtime:', computedValues.runtimeText, 'runtime')}
        {renderGridItem('Country:', computedValues.countryText, 'country')}
        {renderGridItem('Languages:', computedValues.languagesText, 'languages')}
      </View>
    </View>
  );
};

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
    width: '100%',
    maxWidth: 320,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelContainer: {
    minWidth: 120,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 14,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  value: {
    fontSize: 14,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    paddingRight: 5,
  },
});

export default MediaContentDetailsList;