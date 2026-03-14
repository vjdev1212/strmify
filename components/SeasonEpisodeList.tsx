import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { StyleSheet, Pressable, useWindowDimensions, Animated, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { Text, View } from './Themed';
import { formatDate } from '@/utils/Date';
import { SvgXml } from 'react-native-svg';
import { DefaultEpisodeThumbnailImgXml } from '@/utils/Svg';
import { MenuView, MenuComponentRef } from '@react-native-menu/menu';
import CustomContextMenu from './ContextMenu';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface Episode {
  name: string; title: string; season: number; episode: number;
  number: number; thumbnail: string; description: string;
  overview: string; firstAired: string; released: string;
}
interface SeasonEpisodeListProps { videos: Episode[]; onEpisodeSelect: (season: number, episode: number) => void; }
interface EpisodeItemProps { item: Episode; onEpisodeSelect: (season: number, episode: number) => void; cardWidth: number; }

const ANIMATION_DURATION = 100;
const IMAGE_LOAD_DELAY = 100;
const THUMBNAIL_ASPECT_RATIO = 16 / 9;
const CARD_GAP = 16;

const getCardWidth = (screenWidth: number, screenHeight: number) => screenHeight > screenWidth ? 210 : 240;

const EpisodeItem: React.FC<EpisodeItemProps> = React.memo(({ item, onEpisodeSelect, cardWidth }) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [imgError, setImgError] = useState(false);
  const [scaleAnim] = useState(() => new Animated.Value(1));

  const computedValues = useMemo(() => ({
    episodeTitle: `${item.episode || item.number}. ${item.name || item.title}`,
    episodeAired: formatDate(item.firstAired) || formatDate(item.released),
  }), [item]);

  const handleImageError = useCallback(() => setImgError(true), []);
  const handlePress = useCallback(() => onEpisodeSelect(item.season, item.number), [onEpisodeSelect, item.season, item.number]);
  const handlePressIn = useCallback(() => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start(), [scaleAnim]);
  const handlePressOut = useCallback(() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start(), [scaleAnim]);

  useEffect(() => {
    const t = setTimeout(() => {
      setIsLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: ANIMATION_DURATION, useNativeDriver: true }).start();
    }, IMAGE_LOAD_DELAY);
    return () => clearTimeout(t);
  }, [fadeAnim]);

  useEffect(() => { setImgError(false); }, [item.thumbnail]);

  const thumbnailBase = { aspectRatio: THUMBNAIL_ASPECT_RATIO, backgroundColor: colors.background };

  const renderThumbnail = () => {
    if (isLoading) return <View style={styles.thumbnailWrapper}><View style={[styles.skeletonBackground, thumbnailBase]} /></View>;
    if (!imgError) return <View style={styles.thumbnailWrapper}><Animated.Image source={{ uri: item.thumbnail }} onError={handleImageError} style={[styles.thumbnail, thumbnailBase, { opacity: fadeAnim }]} /></View>;
    return <View style={styles.thumbnailWrapper}><View style={[styles.thumbnailPlaceHolder, thumbnailBase]}><SvgXml xml={DefaultEpisodeThumbnailImgXml} width="40%" height="40%" /></View></View>;
  };

  return (
    <Animated.View style={[styles.episodeContainer, { width: cardWidth, transform: [{ scale: scaleAnim }] }]}>
      <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.episodePressable}>
        <View style={styles.episodeCard}>
          <View style={styles.thumbnailContainer}>{renderThumbnail()}</View>
          <View style={styles.episodeInfo}>
            <Text style={[styles.episodeTitle, { color: colors.text }]} numberOfLines={2}>{computedValues.episodeTitle}</Text>
            <Text style={[styles.episodeAired, { color: colors.textMuted }]}>{computedValues.episodeAired}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const SeasonEpisodeList: React.FC<SeasonEpisodeListProps> = ({ videos, onEpisodeSelect }) => {
  const { colors } = useTheme();
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const { width, height } = useWindowDimensions();
  const menuRef = useRef<MenuComponentRef>(null);
  const [webMenuVisible, setWebMenuVisible] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState({ x: 0, y: 0 });

  const computedValues = useMemo(() => {
    const cardWidth = getCardWidth(width, height);
    const groupedEpisodes = videos.reduce((acc, video) => {
      if (!acc[video.season]) acc[video.season] = [];
      acc[video.season].push(video);
      return acc;
    }, {} as Record<number, Episode[]>);

    const seasonData = [
      ...Object.keys(groupedEpisodes).map(Number).filter(s => s !== 0).sort((a, b) => a - b),
      ...(groupedEpisodes[0] ? [0] : []),
    ];

    return {
      cardWidth,
      groupedEpisodes,
      seasonData,
      menuActions: seasonData.map(season => ({
        id: `season-${season}`,
        title: season === 0 ? 'Specials' : `Season ${season}`,
        titleColor: selectedSeason === season ? colors.primary : '#ffffff',
        state: selectedSeason === season ? ('on' as const) : undefined,
      })),
      webMenuItems: seasonData.map((season, index) => ({
        id: `season-${season}-${index}`,
        title: season === 0 ? 'Specials' : `Season ${season}`,
        value: season,
        key: `season-item-${season}-${index}`
      })),
    };
  }, [videos, height, width, selectedSeason, colors.primary]);

  const handleSeasonSelect = useCallback((season: number) => { setSelectedSeason(season); setWebMenuVisible(false); }, []);
  const handleMenuPress = useCallback(({ nativeEvent }: any) => {
    const match = nativeEvent.event.match(/season-(\d+)/);
    if (match) handleSeasonSelect(parseInt(match[1], 10));
  }, [handleSeasonSelect]);
  const handleWebSeasonDropdownPress = useCallback((event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setAnchorPosition({ x: pageX, y: pageY });
    setWebMenuVisible(true);
  }, []);
  const handleWebContextMenuItemSelect = useCallback((item: any) => handleSeasonSelect(item.value || item.id), [handleSeasonSelect]);
  const renderEpisodeItem = useCallback((episode: Episode, index: number) => (
    <EpisodeItem key={`episode-${episode.season}-${episode.episode || episode.number}-${index}`} item={episode} onEpisodeSelect={onEpisodeSelect} cardWidth={computedValues.cardWidth} />
  ), [onEpisodeSelect, computedValues.cardWidth]);

  useEffect(() => {
    if (videos.length > 0) {
      const seasons = Object.keys(videos.reduce((acc, v) => ({ ...acc, [v.season]: true }), {})).map(Number).sort((a, b) => a - b);
      setSelectedSeason(seasons.find(s => s !== 0) || seasons[0] || 1);
    }
  }, [videos]);

  if (!videos || videos.length === 0) {
    return <View style={styles.emptyContainer}><Text style={[styles.emptyText, { color: colors.textMuted }]}>No episodes available</Text></View>;
  }

  const getCurrentSeasonText = () => selectedSeason === 0 ? 'Specials' : `Season ${selectedSeason}`;

  return (
    <View style={styles.container}>
      <View style={styles.seasonListContainer}>
        {Platform.OS === 'web' ? (
          <>
            <TouchableOpacity style={styles.seasonDropdownButton} onPress={handleWebSeasonDropdownPress}>
              <Text style={[styles.seasonDropdownText, { color: colors.text }]}>{getCurrentSeasonText()}</Text>
              <Text style={[styles.seasonDropdownArrow, { color: colors.text }]}>▼</Text>
            </TouchableOpacity>
            <CustomContextMenu visible={webMenuVisible} onClose={() => setWebMenuVisible(false)} items={computedValues.webMenuItems} selectedItem={selectedSeason} onItemSelect={handleWebContextMenuItemSelect} anchorPosition={anchorPosition} />
          </>
        ) : (
          <MenuView ref={menuRef} onPressAction={handleMenuPress} actions={computedValues.menuActions} shouldOpenOnLongPress={false} themeVariant='dark'>
            <TouchableOpacity style={styles.seasonDropdownButton}>
              <Text style={[styles.seasonDropdownText, { color: colors.text }]}>{getCurrentSeasonText()}</Text>
              <Ionicons name='chevron-expand' size={24} color={colors.text} />
            </TouchableOpacity>
          </MenuView>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.episodeScrollContent} style={styles.episodeScrollView}>
        {computedValues.groupedEpisodes[selectedSeason]?.length > 0
          ? computedValues.groupedEpisodes[selectedSeason].map((ep, i) => renderEpisodeItem(ep, i))
          : <View style={styles.noEpisodesContainer}><Text style={[styles.noEpisodesText, { color: colors.textMuted }]}>No episodes available for {getCurrentSeasonText()}</Text></View>
        }
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', marginBottom: 20 },
  seasonListContainer: { paddingVertical: 8, paddingHorizontal: 20, backgroundColor: 'transparent' },
  seasonDropdownButton: { paddingTop: 10, paddingHorizontal: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', width: 150, maxWidth: 130 },
  seasonDropdownText: { fontSize: 20, fontWeight: '500', letterSpacing: 0.3, flex: 1 },
  seasonDropdownArrow: { fontSize: 18, fontWeight: '600' },
  episodeScrollView: { flex: 1 },
  episodeScrollContent: { paddingHorizontal: 20, paddingVertical: 12, gap: CARD_GAP },
  episodeContainer: { marginRight: CARD_GAP },
  episodePressable: { borderRadius: 12, overflow: 'hidden' },
  episodeCard: { backgroundColor: 'transparent', padding: 0 },
  thumbnailContainer: { width: '100%', position: 'relative', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  episodeInfo: { paddingTop: 10, paddingHorizontal: 4, gap: 4, backgroundColor: 'transparent' },
  thumbnailPlaceHolder: { justifyContent: 'center', alignItems: 'center' },
  thumbnail: { width: '100%' },
  episodeTitle: { fontSize: 14, fontWeight: '500', lineHeight: 18 },
  episodeAired: { fontSize: 12, fontWeight: '400', letterSpacing: 0.1 },
  skeletonBackground: { opacity: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, textAlign: 'center' },
  noEpisodesContainer: { paddingVertical: 40, alignItems: 'center' },
  noEpisodesText: { fontSize: 14, textAlign: 'center' },
  thumbnailWrapper: { position: 'relative', overflow: 'hidden' },
});

export default SeasonEpisodeList;