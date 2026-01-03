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
  isPortrait: boolean;
}

// Constants
const THUMBNAIL_BACKGROUND_COLOR = '#0f0f0f';
const EPISODE_AIRED_COLOR = '#afafaf';
const EPISODE_DESCRIPTION_COLOR = '#efefef';
const SELECTED_SEASON_COLOR = '#535aff';
const ANIMATION_DURATION = 100;
const IMAGE_LOAD_DELAY = 100;
const THUMBNAIL_ASPECT_RATIO = 16 / 9;
const CARD_WIDTH = 260;
const CARD_GAP = 16;

const EpisodeItem: React.FC<EpisodeItemProps> = React.memo(({ item, onEpisodeSelect }) => {
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [imgError, setImgError] = useState(false);
  const [scaleAnim] = useState(() => new Animated.Value(1));

  // Memoized computed values
  const computedValues = useMemo(() => {
    const episodeTitle = `${item.episode || item.number}. ${item.name || item.title}`;
    const episodeAired = formatDate(item.firstAired) || formatDate(item.released);
    const episodeDescription = item.description || item.overview;

    return {
      episodeTitle,
      episodeAired,
      episodeDescription,
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
            <Text style={styles.episodeTitle} numberOfLines={1}>
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
      key={`episode-${episode.season}-${episode.episode || episode.number}-${index}`}
      item={episode}
      onEpisodeSelect={onEpisodeSelect}
      isPortrait={computedValues.isPortrait}
    />
  ), [onEpisodeSelect, computedValues.isPortrait]);

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
  episodeScrollView: {
    flex: 1,
  },
  episodeScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: CARD_GAP,
  },
  episodeContainer: {
    width: CARD_WIDTH,
    marginRight: CARD_GAP,
  },
  episodePressable: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  episodeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    width: '100%',
    position: 'relative',
  },
  episodeInfo: {
    padding: 12,
    gap: 4,
  },
  thumbnailPlaceHolder: {
    justifyContent: 'center',
    alignItems: 'center',
    aspectRatio: THUMBNAIL_ASPECT_RATIO,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    width: CARD_WIDTH,
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
  },
  episodeNumberOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(20px)',
    borderBottomRightRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  episodeNumberText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default SeasonEpisodeList;