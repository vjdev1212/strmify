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
const STAR_COLOR = '#E6BD37'; // Gold color for star rating
const GENRE_BG_COLOR = 'rgba(255, 255, 255, 0.15)';
const INFO_BG_COLOR = 'rgba(255, 255, 255, 0.08)';
const SEPARATOR_COLOR = 'rgba(255, 255, 255, 0.6)';
const GENRE_SEPARATOR = '\u00A0\u2022\u00A0'; // Using bullet point separator
const ICON_SIZES = {
  dateRange: 18,
  imdb: 16,
  star: 15,
  clock: 16,
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

    return {
      hasGenre,
      hasRating,
      hasRuntime,
      hasReleased,
      hasAnyInfo,
      genreText,
      yearText,
      runtimeText,
    };
  }, [genre, released, releaseInfo, runtime, imdbRating]);

  // Render helper for info items
  const renderInfoItem = (
    IconComponent: typeof MaterialIcons | typeof FontAwesome | typeof Feather,
    iconName: string,
    iconSize: number,
    text: string,
    showStar?: boolean,
    isRating?: boolean
  ) => (
    <View style={[styles.infoItem, isRating && styles.ratingItem]}>
      <IconComponent
        name={iconName as any}
        size={iconSize}
        color={HEADER_TEXT_COLOR}
        style={styles.icon}
      />
      <Text style={[styles.infoText, isRating && styles.ratingText]}>{text}</Text>
      {showStar && (
        <FontAwesome
          name="star"
          size={ICON_SIZES.star}
          color={STAR_COLOR}
          style={styles.starIcon}
        />
      )}
    </View>
  );

  // Render separator dot
  const renderSeparator = () => (
    <View style={styles.separatorDot} />
  );

  // Build info items array
  // Build info items array
  const infoItems = useMemo(() => {
    const items: React.ReactNode[] = [];
    let keyCounter = 0; // simple counter for unique keys

    if (computedValues.hasReleased) {
      items.push(
        <React.Fragment key={`info-${keyCounter++}`}>
          {renderInfoItem(
            MaterialIcons,
            'date-range',
            ICON_SIZES.dateRange,
            computedValues.yearText
          )}
        </React.Fragment>
      );
    }

    if (computedValues.hasReleased && computedValues.hasRating) {
      items.push(
        <React.Fragment key={`sep-${keyCounter++}`}>
          {renderSeparator()}
        </React.Fragment>
      );
    }

    if (computedValues.hasRating) {
      items.push(
        <React.Fragment key={`info-${keyCounter++}`}>
          {renderInfoItem(
            FontAwesome,
            'imdb',
            ICON_SIZES.imdb,
            imdbRating,
            true,
            true
          )}
        </React.Fragment>
      );
    }

    if ((computedValues.hasReleased || computedValues.hasRating) && computedValues.hasRuntime) {
      items.push(
        <React.Fragment key={`sep-${keyCounter++}`}>
          {renderSeparator()}
        </React.Fragment>
      );
    }

    if (computedValues.hasRuntime) {
      items.push(
        <React.Fragment key={`info-${keyCounter++}`}>
          {renderInfoItem(
            Feather,
            'clock',
            ICON_SIZES.clock,
            computedValues.runtimeText
          )}
        </React.Fragment>
      );
    }

    return items;
  }, [computedValues, imdbRating]);

  return (
    <View style={styles.container}>
      {computedValues.hasGenre && (
        <View style={styles.genreContainer}>
          <Text style={styles.genre}>{computedValues.genreText}</Text>
        </View>
      )}
      {computedValues.hasAnyInfo && (
        <View style={styles.infoWrapper}>
          <View style={styles.infoContainer}>
            {infoItems}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  genreContainer: {
    borderRadius: 20,
    paddingHorizontal: 16,
    marginBottom: 16
  },
  genre: {
    fontSize: 15,
    textAlign: 'center',
    color: HEADER_TEXT_COLOR,
    letterSpacing: 0.5,
  },
  infoWrapper: {
    borderRadius: 16,
    paddingHorizontal: 15,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  ratingItem: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 2,
  },
  icon: {
    marginRight: 6,
  },
  infoText: {
    fontSize: 15,
    color: HEADER_TEXT_COLOR,
    letterSpacing: 0.3,
  },
  ratingText: {
    marginRight: 4,
  },
  starIcon: {
    marginLeft: 2
  },
  separatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: SEPARATOR_COLOR,
    marginHorizontal: 5,
  },
});

export default MediaContentHeader;