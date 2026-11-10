import React, { useState, useCallback, useRef } from 'react';
import {
  ScrollView,
  Pressable,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from '@vjdev1212/media-ui-kit';
import WatchHistory, { WatchHistoryItem } from '@/components/WatchHistory';
import { LibraryItem, libraryService } from '@/utils/LibraryService';
import { BottomSpacing } from '@vjdev1212/media-ui-kit';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import NativeStackList from '@/components/native-stack-list';
import { PosterArtwork } from '@vjdev1212/media-ui-kit';
import { radius, spacing, typography } from '@/constants/theme';

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
  const touchStartRef = useRef<{ pageX: number; pageY: number } | null>(null);
  const didScrollRef = useRef(false);

  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;

  const CARD_WIDTH = isPortrait ? 190 : 240;
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
        await libraryService.removeFromLibrary(item.tmdbid, item.type);
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
      await libraryService.toggleWatchStatus(item.tmdbid, item.type);
      await loadLibrary();
    } catch (error) {
      console.error('Failed to toggle watch status:', error);
    }
  };

  const handleItemPress = (item: LibraryItem) => {
    router.push({
      pathname: item.type === 'movie' ? '/movie/details' : '/series/details',
      params: { tmdbid: item.tmdbid }
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
        playbackSettings: JSON.stringify({
          ...item.playbackSettings,
          positionSeconds: item.playbackSettings?.positionSeconds ?? item.positionSeconds
        }),
        artwork: item.artwork
      },
    });
  };

  const renderLibraryItem = (item: LibraryItem, index: number) => {
    const itemKey = `${item.tmdbid}-${item.type}-${index}`;
    const animValue = getAnimatedValue(itemKey);

    return (
      <Animated.View
        style={[
          { width: CARD_WIDTH },
          { opacity: animValue, transform: [{ scale: animValue }] },
        ]}
      >
        <Pressable
          style={styles.card}
          onTouchStart={(event) => {
            touchStartRef.current = {
              pageX: event.nativeEvent.pageX,
              pageY: event.nativeEvent.pageY,
            };
            didScrollRef.current = false;
          }}
          onTouchMove={(event) => {
            const start = touchStartRef.current;
            if (!start) return;

            const { pageX, pageY } = event.nativeEvent;
            if (Math.abs(pageX - start.pageX) > 10 || Math.abs(pageY - start.pageY) > 10) {
              didScrollRef.current = true;
            }
          }}
          onPress={() => {
            if (!didScrollRef.current) handleItemPress(item);
          }}
        >
          <View style={[styles.imageContainer, { height: CARD_HEIGHT, backgroundColor: colors.background }]}>
            <PosterArtwork key={item.backdrop || item.poster} style={styles.artworkFrame} borderRadius={10}>
              {(onImageLoad) => (
                <Image
                  source={{ uri: item.backdrop || item.poster }}
                  onLoad={onImageLoad}
                  resizeMethod="resize"
                  style={styles.backdrop}
                  resizeMode="cover"
                />
              )}
            </PosterArtwork>
            {item.watched && (
              <View style={styles.watchedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
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
            {item.year && <Text style={[styles.year, { color: colors.text }]}>{item.year}</Text>}
          </View>
        </Pressable>
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
          <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <NativeStackList
          data={items}
          axis="horizontal"
          spacing={CARD_SPACING}
          horizontalContentInset={0}
          style={{ height: CARD_HEIGHT + 62 }}
          renderItem={renderLibraryItem}
          keyExtractor={(item, index) => `${item.tmdbid}-${item.type}-${index}`}
        />
      </View>
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
      <View style={styles.librarySections}>
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
            {renderSection('Watchlists', unwatched, 'eye-outline')}
            {renderSection('Watched', watched, 'checkmark-circle-outline')}
          </>
        )}
      </View>
    );
  };

  const totalCount = getTotalCount();

  return (
    <>
      <ScrollView
        style={styles.container}
        contentInsetAdjustmentBehavior="automatic"
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
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="line.3.horizontal.decrease" title="Filter Library">
          <Stack.Toolbar.MenuAction
            isOn={activeCategory === 'all'}
            onPress={() => setActiveCategory('all')}
          >
            All
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            isOn={activeCategory === 'movies'}
            onPress={() => setActiveCategory('movies')}
          >
            Movies
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            isOn={activeCategory === 'tv'}
            onPress={() => setActiveCategory('tv')}
          >
            Series
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  summary: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  headerSubtitle: { ...typography.caption },
  librarySections: { gap: spacing.lg, paddingTop: spacing.lg },
  section: { marginTop: 0, marginBottom: 0, paddingHorizontal: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { ...typography.headline },
  sectionCount: { ...typography.caption, fontWeight: '500' },
  card: { backgroundColor: 'transparent', borderRadius: radius.md },
  imageContainer: { width: '100%', position: 'relative', borderRadius: radius.md, overflow: 'hidden' },
  artworkFrame: { width: '100%', height: '100%' },
  backdrop: { width: '100%', height: '100%' },
  watchedBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 16, padding: 4 },
  watchButton: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 16, padding: 6 },
  removeButton: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 16, padding: 6 },
  infoContainer: { paddingTop: 8, paddingHorizontal: 4 },
  title: { fontSize: 14, fontWeight: '500', marginBottom: 4, lineHeight: 18 },
  year: { fontSize: 12, opacity: 0.6, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '500', marginTop: 20, marginBottom: 8 },
  emptyText: { fontSize: 14, opacity: 0.6, textAlign: 'center', lineHeight: 20 },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { fontSize: 16, opacity: 0.6 },
});

export default LibraryScreen;
