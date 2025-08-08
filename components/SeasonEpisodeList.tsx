import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { StyleSheet, FlatList, Pressable, useWindowDimensions, Animated } from 'react-native';
import { Text, View } from './Themed';
import * as Haptics from 'expo-haptics';
import { formatDate } from '@/utils/Date';
import { isHapticsSupported } from '@/utils/platform';
import { useColorScheme } from './useColorScheme';
import { SvgXml } from 'react-native-svg';
import { DefaultEpisodeThumbnailImgXml } from '@/utils/Svg';

// Type definitions
interface Episode {
  name: string;
  title: string;
  season: number;
  episode: number;
  number: number;
  thumbnail: string;
  description: string;
  overview: string;
  firstAired: string;
  released: string;
}

interface SeasonEpisodeListProps {
  videos: Episode[];
  onEpisodeSelect: (season: number, episode: number) => void;
}

interface EpisodeItemProps {
  item: Episode;
  onEpisodeSelect: (season: number, episode: number) => void;
  isPortrait: boolean;
  itemWidth: string;
}

// Device type detection based on screen width
const getDeviceType = (width: number) => {
  if (width < 950) return 'mobile';
  if (width < 1024) return 'tablet';
  if (width < 1440) return 'laptop';
  return 'desktop';
};

// Get number of columns based on device and orientation
const getColumnsForDevice = (deviceType: string, isPortrait: boolean) => {
  const columnConfig: any = {
    mobile: { portrait: 1, landscape: 2 },
    tablet: { portrait: 2, landscape: 3 },
    laptop: { portrait: 2, landscape: 3 },
    desktop: { portrait: 3, landscape: 4 },
  };
  
  return columnConfig[deviceType][isPortrait ? 'portrait' : 'landscape'];
};

// Constants
const THUMBNAIL_BACKGROUND_COLOR = '#0f0f0f';
const EPISODE_AIRED_COLOR = '#afafaf';
const EPISODE_DESCRIPTION_COLOR = '#efefef';
const SELECTED_SEASON_COLOR = 'rgba(83, 90, 255, 0.75)';
const DARK_SEASON_BUTTON_COLOR = '#101010';
const LIGHT_SEASON_BUTTON_COLOR = '#f0f0f0';
const ANIMATION_DURATION = 500;
const IMAGE_LOAD_DELAY = 100;
const THUMBNAIL_ASPECT_RATIO = 16 / 9;
const PORTRAIT_THUMBNAIL_HEIGHT = 80;
const LANDSCAPE_THUMBNAIL_WIDTH = 160;

const EpisodeItem: React.FC<EpisodeItemProps> = React.memo(({ item, onEpisodeSelect, isPortrait, itemWidth }) => {
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [imgError, setImgError] = useState(false);

  // Memoized computed values
  const computedValues = useMemo(() => {
    const thumbnailHeight = isPortrait ? PORTRAIT_THUMBNAIL_HEIGHT : null;
    const thumbnailWidth = isPortrait ? null : LANDSCAPE_THUMBNAIL_WIDTH;
    const episodeTitle = `${item.episode || item.number}. ${item.name || item.title}`;
    const episodeAired = formatDate(item.firstAired) || formatDate(item.released);
    const episodeDescription = item.description || item.overview;

    return {
      thumbnailHeight,
      thumbnailWidth,
      episodeTitle,
      episodeAired,
      episodeDescription,
    };
  }, [item, isPortrait]);

  // Memoized styles
  const thumbnailStyle = useMemo(() => ({
    ...styles.thumbnail,
    backgroundColor: THUMBNAIL_BACKGROUND_COLOR,
    height: computedValues.thumbnailHeight,
    width: computedValues.thumbnailWidth,
    aspectRatio: THUMBNAIL_ASPECT_RATIO,
  }), [computedValues.thumbnailHeight, computedValues.thumbnailWidth]);

  const placeholderStyle = useMemo(() => ({
    ...styles.thumbnailPlaceHolder,
    backgroundColor: THUMBNAIL_BACKGROUND_COLOR,
    height: computedValues.thumbnailHeight,
    width: computedValues.thumbnailWidth,
    aspectRatio: THUMBNAIL_ASPECT_RATIO,
  }), [computedValues.thumbnailHeight, computedValues.thumbnailWidth]);

  const episodeAiredStyle = useMemo(() => ({
    ...styles.episodeAired,
    color: EPISODE_AIRED_COLOR,
  }), []);

  const episodeDescriptionStyle = useMemo(() => ({
    ...styles.episodeDescription,
    color: EPISODE_DESCRIPTION_COLOR,
  }), []);

  // Memoized callbacks
  const handleImageError = useCallback(() => {
    setImgError(true);
  }, []);

  const handleEpisodeSelect = useCallback(async (season: number, episode: number) => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    setSelectedEpisode(episode);
    onEpisodeSelect(season, episode);
  }, [onEpisodeSelect]);

  const handlePress = useCallback(() => {
    handleEpisodeSelect(item.season, item.number);
  }, [handleEpisodeSelect, item.season, item.number]);

  // Animation effect
  useEffect(() => {
    const imageLoader = setTimeout(() => {
      setIsLoading(false);
      const animation = Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      });
      animation.start();
    }, IMAGE_LOAD_DELAY);

    return () => clearTimeout(imageLoader);
  }, [fadeAnim]);

  // Reset image error when thumbnail changes
  useEffect(() => {
    setImgError(false);
  }, [item.thumbnail]);

  const renderThumbnail = () => {
    if (isLoading) {
      return <View style={styles.skeletonBackground} />;
    }

    if (!imgError) {
      return (
        <Animated.Image
          source={{ uri: item.thumbnail }}
          onError={handleImageError}
          style={thumbnailStyle}
        />
      );
    }

    return (
      <View style={placeholderStyle}>
        <SvgXml xml={DefaultEpisodeThumbnailImgXml} />
      </View>
    );
  };

  return (
    <View style={[styles.episodeContainer, { width: itemWidth as any }]}>
      <Pressable onPress={handlePress}>
        <View>
          <View style={styles.episodeRow}>
            <View style={styles.thumbnailContainer}>
              {renderThumbnail()}
            </View>
            <View style={styles.episodeInfo}>
              <Text style={styles.episodeTitle} numberOfLines={3}>
                {computedValues.episodeTitle}
              </Text>
              <Text style={episodeAiredStyle}>
                {computedValues.episodeAired}
              </Text>
            </View>
          </View>
          <View style={styles.descriptionContainer}>
            <Text style={episodeDescriptionStyle} numberOfLines={5}>
              {computedValues.episodeDescription}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
});

const SeasonEpisodeList: React.FC<SeasonEpisodeListProps> = ({ videos, onEpisodeSelect }) => {
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const { width, height } = useWindowDimensions();

  // Memoized computed values
  const computedValues = useMemo(() => {
    const isPortrait = height > width;
    const deviceType = getDeviceType(width);
    const numColumns = getColumnsForDevice(deviceType, isPortrait);
    const itemWidth = `${(100 / numColumns) - 2}%`; // Subtract 2% for margins

    // Group episodes by season
    const groupedEpisodes = videos.reduce((acc, video) => {
      if (!acc[video.season]) {
        acc[video.season] = [];
      }
      acc[video.season].push(video);
      return acc;
    }, {} as Record<number, Episode[]>);

    // Create season data for FlatList
    const seasonData = [
      ...Object.keys(groupedEpisodes)
        .map(Number)
        .filter((season) => season !== 0),
      0,
    ];

    return {
      isPortrait,
      deviceType,
      numColumns,
      itemWidth,
      groupedEpisodes,
      seasonData,
    };
  }, [videos, height, width]);

  // Memoized callbacks
  const handleSeasonSelect = useCallback(async (season: number) => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    setSelectedSeason(season);
  }, []);

  const getSeasonButtonStyle = useCallback((season: number) => ({
    ...styles.seasonButton,
    backgroundColor:
      DARK_SEASON_BUTTON_COLOR,
    ...(season === selectedSeason && styles.selectedSeasonButton),
  }), [selectedSeason]);

  const getSeasonTextStyle = useCallback((season: number) => ({
    ...styles.seasonText,
    ...(season === selectedSeason && styles.selectedSeasonText),
  }), [selectedSeason]);

  const renderSeasonItem = useCallback(({ item }: { item: number }) => (
    <Pressable
      style={getSeasonButtonStyle(item)}
      onPress={() => handleSeasonSelect(item)}
    >
      <Text style={getSeasonTextStyle(item)}>
        {item === 0 ? 'Specials' : `Season ${item}`}
      </Text>
    </Pressable>
  ), [getSeasonButtonStyle, getSeasonTextStyle, handleSeasonSelect]);

  const renderEpisodeItem = useCallback((episode: Episode) => (
    <EpisodeItem
      key={`${episode.season}-${episode.number}`}
      item={episode}
      onEpisodeSelect={onEpisodeSelect}
      isPortrait={computedValues.isPortrait}
      itemWidth={computedValues.itemWidth}
    />
  ), [onEpisodeSelect, computedValues.isPortrait, computedValues.itemWidth]);

  const keyExtractor = useCallback((item: number) => `season-${item}`, []);

  // Handle initial selection when videos load
  useEffect(() => {
    if (videos.length > 0) {
      const defaultEpisode = videos.find((video) => video.season === 1 && video.number === 1);
      if (defaultEpisode) {
        setSelectedSeason(1);
      }
    }
  }, [videos]);

  // Early return if no videos
  if (!videos || videos.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View>
        <FlatList
          data={computedValues.seasonData}
          horizontal
          keyExtractor={keyExtractor}
          renderItem={renderSeasonItem}
          contentContainerStyle={styles.seasonList}
          showsHorizontalScrollIndicator={false}
        />
      </View>
      <View style={styles.episodeList}>
        {computedValues.groupedEpisodes[selectedSeason]?.map(renderEpisodeItem)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
  },
  seasonList: {
    paddingHorizontal: '3%',
    marginVertical: 10,
    justifyContent: 'flex-start',
    flexDirection: 'row',
    flexGrow: 1,
  },
  seasonButton: {
    marginRight: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  selectedSeasonButton: {
    backgroundColor: SELECTED_SEASON_COLOR,
  },
  seasonText: {
    fontSize: 16,
  },
  selectedSeasonText: {
    color: '#fff',
  },
  episodeList: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  episodeContainer: {
    marginHorizontal: '1%',
    marginVertical: 10,
    alignSelf: 'flex-start',
  },
  episodeRow: {
    flexDirection: 'row',
    marginRight: 5,
  },
  thumbnailContainer: {
    width: '50%',
  },
  episodeInfo: {
    justifyContent: 'center',
    width: '50%',
  },
  descriptionContainer: {
    justifyContent: 'center',
    width: '100%',
    marginRight: 5,
  },
  thumbnailPlaceHolder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    marginRight: 15,
    aspectRatio: THUMBNAIL_ASPECT_RATIO,
    marginVertical: 20,
  },
  thumbnail: {
    borderRadius: 6,
    marginRight: 15,
    aspectRatio: THUMBNAIL_ASPECT_RATIO,
    marginVertical: 20,
  },
  episodeTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  episodeAired: {
    marginTop: 5,
    fontSize: 12,
  },
  episodeDescription: {
    marginTop: 5,
    fontSize: 13,
    marginRight: 10,
  },
  skeletonBackground: {
    width: '100%',
    height: '100%',
    opacity: 0.1,
  },
});

export default SeasonEpisodeList;