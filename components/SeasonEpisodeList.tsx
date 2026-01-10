import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { StyleSheet, Pressable, useWindowDimensions, Animated, TouchableOpacity, Platform, ScrollView } from 'react-native';
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
  cardWidth: number;
}

// Constants
const THUMBNAIL_BACKGROUND_COLOR = '#0f0f0f';
const EPISODE_AIRED_COLOR = '#afafaf';
const SELECTED_SEASON_COLOR = '#535aff';
const ANIMATION_DURATION = 100;
const IMAGE_LOAD_DELAY = 100;
const THUMBNAIL_ASPECT_RATIO = 16 / 9;
const CARD_GAP = 16;

// Function to calculate card width based on screen dimensions
const getCardWidth = (screenWidth: number, screenHeight: number) => {
  const isPortrait = screenHeight > screenWidth;

  if (isPortrait) {
    return 210;
  } else {
    return 320;
  }
};

const EpisodeItem: React.FC<EpisodeItemProps> = React.memo(({ item, onEpisodeSelect, cardWidth }) => {
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [imgError, setImgError] = useState(false);
  const [scaleAnim] = useState(() => new Animated.Value(1));

  // Memoized computed values
  const computedValues = useMemo(() => {
    const episodeTitle = `${item.episode || item.number}. ${item.name || item.title}`;
    const episodeAired = formatDate(item.firstAired) || formatDate(item.released);

    return {
      episodeTitle,
      episodeAired,
    };
  }, [item]);

  // Memoized styles
  const thumbnailStyle = useMemo(() => ({
    ...styles.thumbnail,
    backgroundColor: THUMBNAIL_BACKGROUND_COLOR,
    aspectRatio: THUMBNAIL_ASPECT_RATIO,
  }), []);

  const placeholderStyle = useMemo(() => ({
    ...styles.thumbnailPlaceHolder,
    backgroundColor: THUMBNAIL_BACKGROUND_COLOR,
    aspectRatio: THUMBNAIL_ASPECT_RATIO,
  }), []);

  const episodeAiredStyle = useMemo(() => ({
    ...styles.episodeAired,
    color: EPISODE_AIRED_COLOR,
  }), []);

  // Memoized callbacks
  const handleImageError = useCallback(() => {
    setImgError(true);
  }, []);

  const handleEpisodeSelect = useCallback(async (season: number, episode: number) => {
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
        </View>
      );
    }

    return (
      <View style={styles.thumbnailWrapper}>
        <View style={placeholderStyle}>
          <SvgXml xml={DefaultEpisodeThumbnailImgXml} width="40%" height="40%" />
        </View>
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.episodeContainer,
        {
          width: cardWidth,
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
          <View style={styles.thumbnailContainer}>
            {renderThumbnail()}
          </View>
          <View style={styles.episodeInfo}>
            <Text style={styles.episodeTitle} numberOfLines={2}>
              {computedValues.episodeTitle}
            </Text>
            <Text style={episodeAiredStyle}>
              {computedValues.episodeAired}
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
    const cardWidth = getCardWidth(width, height);

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
      cardWidth,
      groupedEpisodes,
      seasonData,
      menuActions,
      webMenuItems,
    };
  }, [videos, height, width, selectedSeason]);

  // Memoized callbacks
  const handleSeasonSelect = useCallback(async (season: number) => {
    setSelectedSeason(season);
    setWebMenuVisible(false);
  }, []);

  const handleMenuPress = useCallback(async ({ nativeEvent }: any) => {
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
    setAnchorPosition({ x: pageX, y: pageY });
    setWebMenuVisible(true);
  }, []);

  const handleWebContextMenuItemSelect = useCallback((item: any) => {
    handleSeasonSelect(item.value || item.id);
  }, [handleSeasonSelect]);

  const renderEpisodeItem = useCallback((episode: Episode, index: number) => (
    <EpisodeItem
      key={`episode-${episode.season}-${episode.episode || episode.number}-${index}`}
      item={episode}
      onEpisodeSelect={onEpisodeSelect}
      cardWidth={computedValues.cardWidth}
    />
  ), [onEpisodeSelect, computedValues.cardWidth]);

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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.episodeScrollContent}
        style={styles.episodeScrollView}
      >
        {computedValues.groupedEpisodes[selectedSeason]?.length > 0 ? (
          computedValues.groupedEpisodes[selectedSeason].map((episode, index) =>
            renderEpisodeItem(episode, index)
          )
        ) : (
          <View style={styles.noEpisodesContainer}>
            <Text style={styles.noEpisodesText}>
              No episodes available for {getCurrentSeasonText()}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    marginBottom: 20
  },
  seasonListContainer: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  seasonDropdownButton: {
    backgroundColor: '#202020bf',
    borderRadius: 12,
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
  episodeScrollView: {
    flex: 1,
  },
  episodeScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: CARD_GAP,
  },
  episodeContainer: {
    marginRight: CARD_GAP,
  },
  episodePressable: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  episodeCard: {
    backgroundColor: 'transparent',
    padding: 0,
  },
  thumbnailContainer: {
    width: '100%',
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  episodeInfo: {
    paddingTop: 10,
    paddingHorizontal: 4,
    gap: 4,
    backgroundColor: 'transparent',
  },
  thumbnailPlaceHolder: {
    justifyContent: 'center',
    alignItems: 'center',
    aspectRatio: THUMBNAIL_ASPECT_RATIO,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: THUMBNAIL_ASPECT_RATIO,
  },
  episodeTitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
    color: '#ffffff',
  },
  episodeAired: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  skeletonBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    overflow: 'hidden',
  }
});

export default SeasonEpisodeList;