import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { StyleSheet, Pressable, useWindowDimensions, Animated, TouchableOpacity, Platform } from 'react-native';
import { Text, View } from './Themed';
import * as Haptics from 'expo-haptics';
import { formatDate } from '@/utils/Date';
import { isHapticsSupported } from '@/utils/platform';
import { SvgXml } from 'react-native-svg';
import { DefaultEpisodeThumbnailImgXml } from '@/utils/Svg';
import { MenuView, MenuComponentRef } from '@react-native-menu/menu';
import CustomContextMenu from './ContextMenu';
import { Ionicons } from '@expo/vector-icons';

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
const SELECTED_SEASON_COLOR = '#535aff';
const DARK_SEASON_BUTTON_COLOR = '#101010';
const LIGHT_SEASON_BUTTON_COLOR = '#f0f0f0';
const ANIMATION_DURATION = 100;
const IMAGE_LOAD_DELAY = 100;
const THUMBNAIL_ASPECT_RATIO = 16 / 9;
const PORTRAIT_THUMBNAIL_HEIGHT = 80;
const LANDSCAPE_THUMBNAIL_WIDTH = 160;

const EpisodeItem: React.FC<EpisodeItemProps> = React.memo(({ item, onEpisodeSelect, isPortrait, itemWidth }) => {
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [imgError, setImgError] = useState(false);
  const [scaleAnim] = useState(() => new Animated.Value(1));

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
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedEpisode(episode);
    onEpisodeSelect(season, episode);
  }, [onEpisodeSelect]);

  const handlePress = useCallback(() => {
    handleEpisodeSelect(item.season, item.number);
  }, [handleEpisodeSelect, item.season, item.number]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

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
      return (
        <View style={styles.thumbnailWrapper}>
          <View style={[styles.skeletonBackground, thumbnailStyle]} />
        </View>
      );
    }

    if (!imgError) {
      return (
        <View style={styles.thumbnailWrapper}>
          <Animated.Image
            source={{ uri: item.thumbnail }}
            onError={handleImageError}
            style={[thumbnailStyle, { opacity: fadeAnim }]}
          />
          <View style={styles.episodeNumberOverlay}>
            <Text style={styles.episodeNumberText}>
              {item.episode || item.number}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.thumbnailWrapper}>
        <View style={placeholderStyle}>
          <SvgXml xml={DefaultEpisodeThumbnailImgXml} width="40%" height="40%" />
        </View>
        <View style={styles.episodeNumberOverlay}>
          <Text style={styles.episodeNumberText}>
            {item.episode || item.number}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.episodeContainer,
        {
          width: itemWidth as any,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.episodePressable}
      >
        <View style={styles.episodeCard}>
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
            <Text style={episodeDescriptionStyle} numberOfLines={3}>
              {computedValues.episodeDescription}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const SeasonEpisodeList: React.FC<SeasonEpisodeListProps> = ({ videos, onEpisodeSelect }) => {
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const { width, height } = useWindowDimensions();
  const menuRef = useRef<MenuComponentRef>(null);

  // Web-only dropdown state for CustomContextMenu
  const [webMenuVisible, setWebMenuVisible] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState({ x: 0, y: 0 });

  // Memoized computed values
  const computedValues = useMemo(() => {
    const isPortrait = height > width;
    const deviceType = getDeviceType(width);
    const numColumns = getColumnsForDevice(deviceType, isPortrait);
    const itemWidth = `${(100 / numColumns) - 1.5}%`;

    // Group episodes by season
    const groupedEpisodes = videos.reduce((acc, video) => {
      if (!acc[video.season]) {
        acc[video.season] = [];
      }
      acc[video.season].push(video);
      return acc;
    }, {} as Record<number, Episode[]>);

    // Create season data for dropdown
    const seasonData = [
      ...Object.keys(groupedEpisodes)
        .map(Number)
        .filter((season) => season !== 0)
        .sort((a, b) => a - b),
      ...(groupedEpisodes[0] ? [0] : []),
    ];

    // Create menu actions for @react-native-menu/menu
    const menuActions = seasonData.map((season) => ({
      id: `season-${season}`,
      title: season === 0 ? 'Specials' : `Season ${season}`,
      titleColor: selectedSeason === season ? SELECTED_SEASON_COLOR : '#ffffff',
      state: selectedSeason === season ? ('on' as const) : undefined,
    }));

    // Create menu items for CustomContextMenu (web)
    const webMenuItems = seasonData.map((season, index) => ({
      id: `season-${season}-${index}`,
      title: season === 0 ? 'Specials' : `Season ${season}`,
      value: season,
      key: `season-item-${season}-${index}`
    }));

    return {
      isPortrait,
      deviceType,
      numColumns,
      itemWidth,
      groupedEpisodes,
      seasonData,
      menuActions,
      webMenuItems,
    };
  }, [videos, height, width, selectedSeason]);

  // Memoized callbacks
  const handleSeasonSelect = useCallback(async (season: number) => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedSeason(season);
    setWebMenuVisible(false);
  }, []);

  const handleMenuPress = useCallback(async ({ nativeEvent }: any) => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const actionId = nativeEvent.event;
    const seasonMatch = actionId.match(/season-(\d+)/);
    if (seasonMatch) {
      const season = parseInt(seasonMatch[1], 10);
      handleSeasonSelect(season);
    }
  }, [handleSeasonSelect]);

  // Web dropdown handlers for CustomContextMenu
  const handleWebSeasonDropdownPress = useCallback(async (event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setAnchorPosition({ x: pageX, y: pageY });
    setWebMenuVisible(true);
  }, []);

  const handleWebContextMenuItemSelect = useCallback((item: any) => {
    handleSeasonSelect(item.value || item.id);
  }, [handleSeasonSelect]);

  const renderEpisodeItem = useCallback((episode: Episode, index: number) => (
    <EpisodeItem
      item={episode}
      onEpisodeSelect={onEpisodeSelect}
      isPortrait={computedValues.isPortrait}
      itemWidth={computedValues.itemWidth}
    />
  ), [onEpisodeSelect, computedValues.isPortrait, computedValues.itemWidth]);

  // Handle initial selection when videos load
  useEffect(() => {
    if (videos.length > 0) {
      const availableSeasons = Object.keys(
        videos.reduce((acc, video) => ({ ...acc, [video.season]: true }), {})
      ).map(Number).sort((a, b) => a - b);

      const defaultSeason = availableSeasons.find(s => s !== 0) || availableSeasons[0] || 1;
      setSelectedSeason(defaultSeason);
    }
  }, [videos]);

  // Early return if no videos
  if (!videos || videos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No episodes available</Text>
      </View>
    );
  }

  // Get current season display text
  const getCurrentSeasonText = () => {
    return selectedSeason === 0 ? 'Specials' : `Season ${selectedSeason}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.seasonListContainer}>
        {Platform.OS === 'web' ? (
          <>
            <TouchableOpacity
              style={styles.seasonDropdownButton}
              onPress={handleWebSeasonDropdownPress}
            >
              <Text style={styles.seasonDropdownText}>
                {getCurrentSeasonText()}
              </Text>
              <Text style={styles.seasonDropdownArrow}>▼</Text>
            </TouchableOpacity>

            <CustomContextMenu
              visible={webMenuVisible}
              onClose={() => setWebMenuVisible(false)}
              items={computedValues.webMenuItems}
              selectedItem={selectedSeason}
              onItemSelect={handleWebContextMenuItemSelect}
              anchorPosition={anchorPosition}
            />
          </>
        ) : (
          <MenuView
            ref={menuRef}
            onPressAction={handleMenuPress}
            actions={computedValues.menuActions}
            shouldOpenOnLongPress={false}
            themeVariant='dark'
          >
            <TouchableOpacity style={styles.seasonDropdownButton}>
              <Text style={styles.seasonDropdownText}>
                {getCurrentSeasonText()}
              </Text>
              <Ionicons name='caret-down-circle-outline' size={24} color='#ffffff' />
            </TouchableOpacity>
          </MenuView>
        )}
      </View>

      <View style={styles.episodeList}>
        {computedValues.groupedEpisodes[selectedSeason]?.length > 0 ? (
          computedValues.groupedEpisodes[selectedSeason].map((episode, index) => (
            <React.Fragment key={`episode-${episode.season}-${episode.episode || episode.number}-${index}`}>
              {renderEpisodeItem(episode, index)}
            </React.Fragment>
          ))
        ) : (
          <View style={styles.noEpisodesContainer}>
            <Text style={styles.noEpisodesText}>
              No episodes available for {getCurrentSeasonText()}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  seasonListContainer: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  seasonDropdownButton: {
    backgroundColor: '#202020bf',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 160,
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  seasonDropdownText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
    letterSpacing: 0.3,
    flex: 1,
  },
  seasonDropdownArrow: {
    fontSize: 14,
    color: '#cccccc',
  },
  seasonList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  seasonSeparator: {
    width: 12,
  },
  seasonButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  seasonText: {
    fontSize: 16,
    letterSpacing: 0.3,
  },
  episodeList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  episodeContainer: {
    marginVertical: 6,
    alignSelf: 'flex-start',
  },
  episodePressable: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  episodeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  episodeRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  thumbnailContainer: {
    marginRight: 15,
    position: 'relative',
  },
  episodeInfo: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  descriptionContainer: {
    width: '100%',
  },
  thumbnailPlaceHolder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    aspectRatio: THUMBNAIL_ASPECT_RATIO,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  thumbnail: {
    borderRadius: 8,
  },
  episodeTitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
    color: '#ffffff',
    marginBottom: 4,
  },
  episodeAired: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  episodeDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    letterSpacing: 0.1,
    marginTop: 2,
  },
  skeletonBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    opacity: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  noEpisodesContainer: {
    width: '100%',
    paddingVertical: 40,
    alignItems: 'center',
  },
  noEpisodesText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  thumbnailWrapper: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  episodeNumberOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(20px)',
    borderRadius: 8,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  episodeNumberText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 500,
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default SeasonEpisodeList;