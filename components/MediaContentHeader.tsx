import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Text, View } from './Themed';
import { getYear } from '@/utils/Date';
import { MaterialIcons, FontAwesome, Feather } from '@expo/vector-icons';

// Type definitions
interface MediaContentHeaderProps {
  name: string;
  genre: string[];
  released: string;
  releaseInfo: string;
  runtime: string;
  imdbRating: string;
}

// Constants
const HEADER_TEXT_COLOR = '#ffffff';
const STAR_COLOR = '#ffffff';
const SEPARATOR_TEXT = '|   ';
const GENRE_SEPARATOR = '\u00A0\u00A0\u00A0|\u00A0\u00A0\u00A0';
const ICON_SIZES = {
  dateRange: 17,
  imdb: 15,
  star: 14,
  clock: 14,
} as const;

const MediaContentHeader: React.FC<MediaContentHeaderProps> = ({
  name,
  genre,
  released,
  releaseInfo,
  runtime,
  imdbRating,
}) => {
  // Memoized computed values
  const computedValues = useMemo(() => {
    const hasGenre = genre?.length > 0;
    const hasRating = imdbRating && imdbRating !== '0.0';
    const hasRuntime = runtime && runtime !== '0';
    const hasReleased = !!released;
    const hasAnyInfo = hasReleased || releaseInfo || hasRating || hasRuntime;
    
    const genreText = hasGenre 
      ? genre.map((g, i) => i === genre.length - 1 ? g : `${g}${GENRE_SEPARATOR}`).join('')
      : '';
    
    const yearText = hasReleased ? getYear(released) || releaseInfo : '';
    const runtimeText = hasRuntime ? `${runtime} mins` : '';
    
    // Calculate which separators to show
    const showFirstSeparator = hasReleased && hasRating;
    const showSecondSeparator = (hasReleased || hasRating) && hasRuntime;
    
    return {
      hasGenre,
      hasRating,
      hasRuntime,
      hasReleased,
      hasAnyInfo,
      genreText,
      yearText,
      runtimeText,
      showFirstSeparator,
      showSecondSeparator,
    };
  }, [genre, released, releaseInfo, runtime, imdbRating]);

  // Render helper for info items
  const renderInfoItem = (
    IconComponent: typeof MaterialIcons | typeof FontAwesome | typeof Feather,
    iconName: string,
    iconSize: number,
    text: string,
    key: string,
    showStar?: boolean
  ) => (
    <View key={key} style={styles.infoItem}>
      <IconComponent name={iconName as any} size={iconSize} color={HEADER_TEXT_COLOR} />
      <Text style={styles.infoText}>{text}</Text>
      {showStar && (
        <FontAwesome name="star-o" size={ICON_SIZES.star} color={STAR_COLOR} />
      )}
    </View>
  );

  // Render separator
  const renderSeparator = (key: string) => (
    <Text key={key} style={styles.separator}>{SEPARATOR_TEXT}</Text>
  );

  // Build info items array
  const infoItems = useMemo(() => {
    const items: React.ReactNode[] = [];
    
    if (computedValues.hasReleased) {
      items.push(
        renderInfoItem(
          MaterialIcons,
          'date-range',
          ICON_SIZES.dateRange,
          ` ${computedValues.yearText}`,
          'date'
        )
      );
    }
    
    if (computedValues.showFirstSeparator) {
      items.push(renderSeparator('sep1'));
    }
    
    if (computedValues.hasRating) {
      items.push(
        renderInfoItem(
          FontAwesome,
          'imdb',
          ICON_SIZES.imdb,
          imdbRating,
          'rating',
          true
        )
      );
    }
    
    if (computedValues.showSecondSeparator) {
      items.push(renderSeparator('sep2'));
    }
    
    if (computedValues.hasRuntime) {
      items.push(
        renderInfoItem(
          Feather,
          'clock',
          ICON_SIZES.clock,
          computedValues.runtimeText,
          'runtime'
        )
      );
    }
    
    return items;
  }, [computedValues, imdbRating]);

  return (
    <View style={styles.container}>
      {computedValues.hasGenre && (
        <Text style={styles.genre}>{computedValues.genreText}</Text>
      )}
      {computedValues.hasAnyInfo && (
        <View style={styles.infoContainer}>
          {infoItems}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 10,
  },
  genre: {
    fontSize: 14,
    marginBottom: 10,
    paddingBottom: 10,
    textAlign: 'center',
    marginHorizontal: 5,
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
    paddingRight: 5,
  },
  separator: {
    fontSize: 14,
  },
});

export default MediaContentHeader;