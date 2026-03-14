import React, { useState, useCallback, useRef } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  RefreshControl,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StatusBar } from '@/components/Themed';
import WatchHistory from '@/components/WatchHistory';
import { LibraryItem, libraryService } from '@/utils/LibraryService';
import BlurGradientBackground from '@/components/BlurGradientBackground';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomSpacing from '@/components/BottomSpacing';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';

interface WatchHistoryItem {
  title: string;
  videoUrl: string;
  imdbid: string;
  type: string;
  season: string;
  episode: string;
  useKsPlayer: string;
  progress: number;
  artwork: string;
  timestamp: number;
}

type CategoryType = 'all' | 'movies' | 'tv';

const LibraryScreen: React.FC = () => {
  const { colors } = useTheme();
  const [allUnwatched, setAllUnwatched] = useState<LibraryItem[]>([]);
  const [allWatched, setAllWatched] = useState<LibraryItem[]>([]);
  const [moviesUnwatched, setMoviesUnwatched] = useState<LibraryItem[]>([]);
  const [moviesWatched, setMoviesWatched] = useState<LibraryItem[]>([]);
  const [seriesUnwatched, setSeriesUnwatched] = useState<LibraryItem[]>([]);
  const [seriesWatched, setSeriesWatched] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all');

  const animatedValues = useRef(new Map<string, Animated.Value>()).current;

  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;

  const CARD_WIDTH = isPortrait ? 210 : 270;
  const CARD_HEIGHT = Math.round((CARD_WIDTH * 9) / 16);
  const CARD_SPACING = 16;

  useFocusEffect(
    useCallback(() => {
      loadLibrary();
    }, [])
  );

  const loadLibrary = async () => {
    try {
      const allItems = await libraryService.getLibrary();
      const latest100 = allItems.slice(0, 100);

      const allUnwatchedItems = latest100.filter(item => !item.watched);
      const allWatchedItems = latest100.filter(item => item.watched);

      const movieItems = latest100.filter(item => item.type === 'movie');
      const moviesUnwatchedItems = movieItems.filter(item => !item.watched);
      const moviesWatchedItems = movieItems.filter(item => item.watched);

      const seriesItems = latest100.filter(item => item.type === 'series');
      const seriesUnwatchedItems = seriesItems.filter(item => !item.watched);
      const seriesWatchedItems = seriesItems.filter(item => item.watched);

      setAllUnwatched(allUnwatchedItems);
      setAllWatched(allWatchedItems);
      setMoviesUnwatched(moviesUnwatchedItems);
      setMoviesWatched(moviesWatchedItems);
      setSeriesUnwatched(seriesUnwatchedItems);
      setSeriesWatched(seriesWatchedItems);
    } catch (error) {
      console.error('Failed to load library:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLibrary();
  };

  const getAnimatedValue = (key: string) => {
    if (!animatedValues.has(key)) {
      animatedValues.set(key, new Animated.Value(1));
    }
    return animatedValues.get(key)!;
  };

  const removeFromLibrary = async (item: LibraryItem, itemKey: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const animValue = getAnimatedValue(itemKey);
      Animated.timing(animValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(async () => {
        await libraryService.removeFromLibrary(item.moviedbid, item.type);
        await loadLibrary();
        animatedValues.delete(itemKey);
      });
    } catch (error) {
      console.error('Failed to remove from library:', error);
    }
  };

  const toggleWatchStatus = async (item: LibraryItem) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await libraryService.toggleWatchStatus(item.moviedbid, item.type);
      await loadLibrary();
    } catch (error) {
      console.error('Failed to toggle watch status:', error);
    }
  };

  const handleItemPress = (item: LibraryItem) => {
    router.push({
      pathname: item.type === 'movie' ? '/movie/details' : '/series/details',
      params: { moviedbid: item.moviedbid }
    });
  };

  const handleWatchHistoryItemSelect = (item: WatchHistoryItem) => {
    router.push({
      pathname: '/stream/player',
      params: {
        videoUrl: item.videoUrl,
        title: item.title,
        imdbid: item.imdbid,
        type: item.type,
        season: item.season,
        episode: item.episode,
        useKsPlayer: item.useKsPlayer,
        progress: item.progress,
        artwork: item.artwork
      },
    });
  };

  const renderLibraryItem = ({ item, index }: { item: LibraryItem; index: number }) => {
    const itemKey = `${item.moviedbid}-${item.type}-${index}`;
    const animValue = getAnimatedValue(itemKey);

    return (
      <Animated.View
        style={[
          { width: CARD_WIDTH },
          { opacity: animValue, transform: [{ scale: animValue }] },
        ]}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleItemPress(item)}
          activeOpacity={0.8}
        >
          <View style={[styles.imageContainer, { height: CARD_HEIGHT, backgroundColor: colors.background }]}>
            <Image
              source={{ uri: item.backdrop || item.poster }}
              style={styles.backdrop}
              resizeMode="cover"
            />
            {item.watched && (
              <View style={styles.watchedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
              </View>
            )}
            <TouchableOpacity
              style={styles.watchButton}
              onPress={(e) => { e.stopPropagation(); toggleWatchStatus(item); }}
              activeOpacity={0.7}
            >
              <Ionicons name={item.watched ? "eye-off-outline" : "eye-outline"} size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={(e) => { e.stopPropagation(); removeFromLibrary(item, itemKey); }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.infoContainer}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
            <View style={styles.metaRow}>
              {item.year && <Text style={[styles.year, { color: colors.text }]}>{item.year}</Text>}
              {item.year && item.genres && item.genres.length > 0 && (
                <Text style={[styles.separator, { color: colors.text }]}>•</Text>
              )}
              {item.genres && item.genres.length > 0 && (
                <Text style={[styles.genres, { color: colors.text }]} numberOfLines={1}>{item.genres[0]}</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderSection = (title: string, items: LibraryItem[], icon: string) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name={icon as any} size={20} color={colors.text} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
          </View>
          <Text style={[styles.sectionCount, { color: colors.text }]}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <FlatList
          data={items}
          renderItem={renderLibraryItem}
          keyExtractor={(item, index) => `${item.moviedbid}-${item.type}-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.flatListContent, { gap: CARD_SPACING }]}
          decelerationRate="normal"
        />
      </View>
    );
  };

  const renderCategoryButton = (category: CategoryType, label: string, icon: string) => {
    const isActive = activeCategory === category;
    return (
      <TouchableOpacity
        style={[
          styles.categoryButton,
          {
            backgroundColor: isActive ? colors.primary : colors.primarySurface,
            borderColor: isActive ? colors.primary : colors.primaryBorder,
          },
        ]}
        onPress={() => setActiveCategory(category)}
        activeOpacity={0.7}
      >
        <Ionicons name={icon as any} size={18} color={isActive ? colors.text : colors.textMuted} />
        <Text style={[styles.categoryButtonText, { color: isActive ? colors.text : colors.textMuted, fontWeight: isActive ? '600' : '500' }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const getTotalCount = () => {
    switch (activeCategory) {
      case 'all': return allUnwatched.length + allWatched.length;
      case 'movies': return moviesUnwatched.length + moviesWatched.length;
      case 'tv': return seriesUnwatched.length + seriesWatched.length;
      default: return 0;
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
        </View>
      );
    }

    const getUnwatched = () => {
      switch (activeCategory) {
        case 'movies': return moviesUnwatched;
        case 'tv': return seriesUnwatched;
        default: return allUnwatched;
      }
    };

    const getWatched = () => {
      switch (activeCategory) {
        case 'movies': return moviesWatched;
        case 'tv': return seriesWatched;
        default: return allWatched;
      }
    };

    const getWatchHistoryType = () => {
      switch (activeCategory) {
        case 'movies': return 'movie';
        case 'tv': return 'series';
        default: return 'all';
      }
    };

    const unwatched = getUnwatched();
    const watched = getWatched();
    const totalCount = unwatched.length + watched.length;

    return (
      <View>
        <WatchHistory onItemSelect={handleWatchHistoryItemSelect} type={getWatchHistoryType()} />
        {totalCount === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="albums-outline" size={80} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {activeCategory === 'all' ? 'Your Library is Empty' : activeCategory === 'movies' ? 'No Movies in Library' : 'No TV Shows in Library'}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Add {activeCategory === 'all' ? 'movies and TV shows' : activeCategory === 'movies' ? 'movies' : 'TV shows'} to your library to watch later
            </Text>
          </View>
        ) : (
          <>
            {renderSection('Unwatched', unwatched, 'eye-outline')}
            {renderSection('Watched', watched, 'checkmark-circle-outline')}
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar />
      <BlurGradientBackground />
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Library</Text>
        <Text style={[styles.headerSubtitle, { color: colors.text }]}>
          {getTotalCount()} {getTotalCount() === 1 ? 'item' : 'items'}
        </Text>
      </View>
      <View style={styles.categoryContainer}>
        {renderCategoryButton('all', 'All', 'albums-outline')}
        {renderCategoryButton('movies', 'Movies', 'film-outline')}
        {renderCategoryButton('tv', 'Series', 'tv-outline')}
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {renderContent()}
        <BottomSpacing space={100} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 32, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, opacity: 0.6 },
  categoryContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  categoryButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20, borderWidth: 1, gap: 8 },
  categoryButtonText: { fontSize: 15 },
  section: { marginTop: 24, marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  sectionCount: { fontSize: 14, opacity: 0.5, fontWeight: '500' },
  flatListContent: { paddingHorizontal: 16 },
  card: { backgroundColor: 'transparent', borderRadius: 10 },
  imageContainer: { width: '100%', position: 'relative', borderRadius: 10, overflow: 'hidden' },
  backdrop: { width: '100%', height: '100%' },
  watchedBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 16, padding: 4 },
  watchButton: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 16, padding: 6 },
  removeButton: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 16, padding: 6 },
  infoContainer: { paddingTop: 8, paddingHorizontal: 4 },
  title: { fontSize: 14, fontWeight: '500', marginBottom: 4, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  year: { fontSize: 12, opacity: 0.6, fontWeight: '500' },
  separator: { fontSize: 12, opacity: 0.4, marginHorizontal: 6 },
  genres: { fontSize: 12, opacity: 0.5, flex: 1 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '500', marginTop: 20, marginBottom: 8 },
  emptyText: { fontSize: 14, opacity: 0.6, textAlign: 'center', lineHeight: 20 },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { fontSize: 16, opacity: 0.6 },
});

export default LibraryScreen;