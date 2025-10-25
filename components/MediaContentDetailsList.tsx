import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Text, View } from './Themed';
import { formatDate } from '@/utils/Date';
import { FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

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
const STAR_COLOR = '#E6BD37';
const STAR_SIZE = 14;

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
    const languagesText =
      languages.length > 0
        ? languages.map(l => l.english_name).join(', ')
        : UNKNOWN_TEXT;
    const runtimeText =
      runtime !== '0' ? `${runtime} mins` : `${UNKNOWN_TEXT} mins`;
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

  // Render helper for table rows
  const renderTableRow = (
    label: string,
    value: string | React.ReactNode,
    key: string,
    isLast?: boolean
  ) => (
    <View key={key} style={[styles.tableRow, !isLast && styles.rowBorder]}>
      <View style={styles.labelCell}>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.valueCell}>
        {typeof value === 'string' ? (
          <Text numberOfLines={2} style={styles.value}>
            {value}
          </Text>
        ) : (
          value
        )}
      </View>
    </View>
  );

  // Render IMDB rating with star
  const renderRatingValue = () => (
    <View style={styles.ratingContainer}>
      <Text style={styles.value}>{computedValues.ratingText}</Text>
      {computedValues.hasRating && (
        <View style={styles.starWrapper}>
          <FontAwesome name="star" size={STAR_SIZE} color={STAR_COLOR} />
        </View>
      )}
    </View>
  );

  // Create table data array
  const tableData = [
    { key: 'released', label: computedValues.releasedLabel, value: computedValues.formattedDate },
    { key: 'rating', label: 'IMDB Rating:', value: renderRatingValue() },
    { key: 'genre', label: 'Genre:', value: computedValues.genreText },
    ...(computedValues.isMovie ? [{ key: 'runtime', label: 'Runtime:', value: computedValues.runtimeText }] : []),
    { key: 'country', label: 'Country:', value: computedValues.countryText },
    { key: 'languages', label: 'Languages:', value: computedValues.languagesText },
  ];

  return (
    <View style={styles.container}>
      {/* Glass background */}
      <BlurView intensity={50} tint="dark" style={styles.tableContainer}>
        {/* Subtle gradient overlay for depth */}
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.01)']}
          style={StyleSheet.absoluteFill}
        />
        {tableData.map((item, index) =>
          renderTableRow(
            item.label,
            item.value,
            item.key,
            index === tableData.length - 1
          )
        )}
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingVertical: 16,
  },
  tableContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(16, 16, 16, 0.4)', // translucent
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  labelCell: {
    width: 120,
    paddingRight: 16,
    justifyContent: 'center',
  },
  valueCell: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ddd',
  },
  value: {
    fontSize: 15,
    fontWeight: '400',
    color: '#ffffff',
    lineHeight: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starWrapper: {
    marginLeft: 8,
    paddingTop: 1,
  },
});

export default MediaContentDetailsList;
