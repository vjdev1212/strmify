import { router } from 'expo-router';
import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  VirtualizedList
} from 'react-native';
import { StatusBar, Text } from '@/components/Themed';
import PosterList from '@/components/PosterList';
import BottomSpacing from '@/components/BottomSpacing';
import AppleTVCarousel from '@/components/PosterCarousel';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported } from '@/utils/platform';
import { CatalogUrl, MovieGneres, TvGneres } from '@/constants/Stremio';

interface ListItem {
  apiUrl: string;
  title: string;
  type: 'movie' | 'series';
  id: string;
}

interface FilterItem {
  key: 'all' | 'movies' | 'series';
  label: string;
  icon: string;
}

export default function HomeScreen() {
  const [filter, setFilter] = useState<'all' | 'movies' | 'series'>('all');

  const filters: FilterItem[] = [
    { key: 'all', label: 'All', icon: 'apps' },
    { key: 'movies', label: 'Movies', icon: 'film-outline' },
    { key: 'series', label: 'Series', icon: 'tv-outline' }
  ];

  // All mode fixed curated list
  const allLists = useMemo(() => [
    { apiUrl: CatalogUrl.trendingMovies, title: 'Movies - Trending', type: 'movie' as const, id: 'trending-movies' },
    { apiUrl: CatalogUrl.trendingSeries, title: 'Series - Trending', type: 'series' as const, id: 'trending-series' },
    { apiUrl: CatalogUrl.popularMovies, title: 'Movies - Popular', type: 'movie' as const, id: 'popular-movies' },
    { apiUrl: CatalogUrl.popularSeries, title: 'Series - Popular', type: 'series' as const, id: 'popular-series' },
    { apiUrl: CatalogUrl.topMovies, title: 'Movies - Top Rated', type: 'movie' as const, id: 'top-movies' },
    { apiUrl: CatalogUrl.topSeries, title: 'Series - Top Rated', type: 'series' as const, id: 'top-series' },
    { apiUrl: CatalogUrl.nowPlayingMovies, title: 'Movies - Now Playing', type: 'movie' as const, id: 'now-playing-movies' },
    { apiUrl: CatalogUrl.onTheAirTv, title: 'Series - On the Air', type: 'series' as const, id: 'on-the-air-tv' },
    { apiUrl: CatalogUrl.upcomingMovies, title: 'Movies - Upcoming', type: 'movie' as const, id: 'upcoming-movies' },
    { apiUrl: CatalogUrl.airingTodayTv, title: 'Series - Airing Today', type: 'series' as const, id: 'airing-today-tv' },
  ], []);

  const movieLists = useMemo(() => [
    { apiUrl: CatalogUrl.trendingMovies, title: 'Trending', type: 'movie' as const, id: 'movie-trending' },
    { apiUrl: CatalogUrl.nowPlayingMovies, title: 'Now Playing', type: 'movie' as const, id: 'movie-now-playing' },
    { apiUrl: MovieGneres.action, title: 'Action', type: 'movie' as const, id: 'movie-action' },
    { apiUrl: MovieGneres.adventure, title: 'Adventure', type: 'movie' as const, id: 'movie-adventure' },
    { apiUrl: MovieGneres.scifi, title: 'Sci-Fi', type: 'movie' as const, id: 'movie-scifi' },
    { apiUrl: MovieGneres.comedy, title: 'Comedy', type: 'movie' as const, id: 'movie-comedy' },
    { apiUrl: MovieGneres.family, title: 'Family', type: 'movie' as const, id: 'movie-family' },
    { apiUrl: MovieGneres.animation, title: 'Animation', type: 'movie' as const, id: 'movie-animation' },
    { apiUrl: MovieGneres.thriller, title: 'Thriller', type: 'movie' as const, id: 'movie-thriller' },
    { apiUrl: MovieGneres.crime, title: 'Crime', type: 'movie' as const, id: 'movie-crime' },
    { apiUrl: MovieGneres.horror, title: 'Horror', type: 'movie' as const, id: 'movie-horror' },
    { apiUrl: MovieGneres.mystery, title: 'Mystery', type: 'movie' as const, id: 'movie-mystery' },
    { apiUrl: MovieGneres.fantasy, title: 'Fantasy', type: 'movie' as const, id: 'movie-fantasy' },
    { apiUrl: MovieGneres.drama, title: 'Drama', type: 'movie' as const, id: 'movie-drama' },
    { apiUrl: MovieGneres.romance, title: 'Romance', type: 'movie' as const, id: 'movie-romance' },
  ], []);

  const seriesLists = useMemo(() => [
    { apiUrl: CatalogUrl.trendingSeries, title: 'Trending', type: 'series' as const, id: 'series-trending' },
    { apiUrl: TvGneres.actionAdventure, title: 'Action & Adventure', type: 'series' as const, id: 'series-action-adventure' },
    { apiUrl: TvGneres.drama, title: 'Drama', type: 'series' as const, id: 'series-drama' },
    { apiUrl: TvGneres.crime, title: 'Crime', type: 'series' as const, id: 'series-crime' },
    { apiUrl: TvGneres.comedy, title: 'Comedy', type: 'series' as const, id: 'series-comedy' },
    { apiUrl: TvGneres.mystery, title: 'Mystery', type: 'series' as const, id: 'series-mystery' },
    { apiUrl: TvGneres.scifiFantsy, title: 'Sci-Fi & Fantasy', type: 'series' as const, id: 'series-scifi-fantasy' },
    { apiUrl: TvGneres.animation, title: 'Animation', type: 'series' as const, id: 'series-animation' },
    { apiUrl: TvGneres.family, title: 'Family', type: 'series' as const, id: 'series-family' },
    { apiUrl: TvGneres.kids, title: 'Kids', type: 'series' as const, id: 'series-kids' },
  ], []);

  // Pick correct list based on filter
  const activeLists = useMemo(() => {
    if (filter === 'all') return allLists;
    if (filter === 'movies') return movieLists;
    if (filter === 'series') return seriesLists;
    return [];
  }, [filter, allLists, movieLists, seriesLists]);

  const handleFilterChange = useCallback(async (newFilter: 'all' | 'movies' | 'series') => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    setFilter(newFilter);
  }, []);

  const handleCarouselItemPress = useCallback((item: any) => {
    const type = item.type == 'movie' ? 'movie' : 'series';
    router.push({
      pathname: `/${type}/details`,
      params: { moviedbid: item.moviedbid },
    });
  }, []);

  // Header component containing carousel and filters
  const ListHeader = useCallback(() => (
    <View>
      {/* Apple TV Carousel */}
      <AppleTVCarousel
        filter={filter}
        onItemPress={handleCarouselItemPress}
        autoPlay={true}
        autoPlayInterval={6000}
      />

      <View style={styles.contentContainer}>
        {/* Filter buttons */}
        <View style={styles.filtersContainer}>
          <FlatList
            data={filters}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filter === item.key && styles.filterButtonActive
                ]}
                onPress={() => handleFilterChange(item.key)}
              >
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={filter === item.key ? '#fff' : '#bbb'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.filterButtonText,
                    filter === item.key && styles.filterButtonTextActive
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </View>
  ), [filter, filters, handleCarouselItemPress, handleFilterChange]);

  // Footer component for bottom spacing
  const ListFooter = useCallback(() => (
    <BottomSpacing space={50} />
  ), []);

  // Render item for the main VirtualizedList
  const renderPosterList = useCallback(({ item }: { item: ListItem }) => (
    <PosterList
      key={item.id}
      apiUrl={item.apiUrl}
      title={item.title}
      type={item.type}
    />
  ), []);

  // Key extractor for VirtualizedList
  const keyExtractor = useCallback((item: ListItem, index: number) => `${filter}-${item.id}-${index}`, [filter]);

  // Get item for VirtualizedList
  const getItem = useCallback((data: ListItem[], index: number) => data[index], []);

  // Get item count for VirtualizedList
  const getItemCount = useCallback((data: ListItem[]) => data.length, []);

  // Get item layout for better performance
  const getItemLayout = useCallback((data: ListItem[] | null | undefined, index: number) => ({
    length: 280, // Approximate height of each PosterList component
    offset: 280 * index,
    index,
  }), []);

  return (
    <View style={styles.container}>
      <StatusBar />
      <VirtualizedList
        data={activeLists}
        renderItem={renderPosterList}
        keyExtractor={keyExtractor}
        getItem={getItem}
        getItemCount={getItemCount}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true} // Improve performance by removing off-screen items
        maxToRenderPerBatch={3} // Render fewer items per batch for better performance
        windowSize={5} // Reduce memory footprint
        initialNumToRender={3} // Render fewer items initially
        // getItemLayout={getItemLayout} // Uncomment if PosterList heights are consistent
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filtersContainer: {
    paddingVertical: 12,
    paddingHorizontal: 5,
  },
  filterRow: {
    paddingHorizontal: 10,
    gap: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(83, 90, 255, 0.3)',
    borderColor: 'rgba(83, 90, 255, 0.5)',
    shadowColor: 'rgba(83, 90, 255, 0.4)',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  filterButtonText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  contentContainer: {
    marginTop: 20,
  },
});