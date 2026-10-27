import { router } from 'expo-router';
import React, { useState, useMemo, useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar, Text } from '@/components/Themed';
import PosterList from '@/components/PosterList';
import BottomSpacing from '@/components/BottomSpacing';
import AppleTVCarousel from '@/components/PosterCarousel';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported } from '@/utils/platform';
import { CatalogUrl, MovieGneres, TvGneres } from '@/constants/Tmdb';
import BlurGradientBackground from '@/components/BlurGradientBackground';
import { useTheme } from '@/context/ThemeContext';
import { NativeButton } from '@/components/native-ui-controls';

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | 'movies' | 'series'>('all');

  const filters = [
    { key: 'all', label: 'All', icon: 'albums-outline' },
    { key: 'movies', label: 'Movies', icon: 'film-outline' },
    { key: 'series', label: 'Series', icon: 'tv-outline' }
  ];

  const allLists = useMemo(() => [
    { apiUrl: CatalogUrl.trendingMovies, title: 'Movies - Trending', type: 'movie' },
    { apiUrl: CatalogUrl.trendingSeries, title: 'Series - Trending', type: 'series' },
    { apiUrl: CatalogUrl.popularMovies, title: 'Movies - Popular', type: 'movie' },
    { apiUrl: CatalogUrl.popularSeries, title: 'Series - Popular', type: 'series' },
    { apiUrl: CatalogUrl.topMovies, title: 'Movies - Top Rated', type: 'movie' },
    { apiUrl: CatalogUrl.topSeries, title: 'Series - Top Rated', type: 'series' },
    { apiUrl: CatalogUrl.nowPlayingMovies, title: 'Movies - Now Playing', type: 'movie' },
    { apiUrl: CatalogUrl.onTheAirTv, title: 'Series - On the Air', type: 'series' },
    { apiUrl: CatalogUrl.upcomingMovies, title: 'Movies - Upcoming', type: 'movie' },
    { apiUrl: CatalogUrl.airingTodayTv, title: 'Series - Airing Today', type: 'series' },
  ], []);

  const movieLists = useMemo(() => [
    { apiUrl: CatalogUrl.trendingMovies, title: 'Trending', type: 'movie' },
    { apiUrl: CatalogUrl.nowPlayingMovies, title: 'Now Playing', type: 'movie' },
    { apiUrl: MovieGneres.action, title: 'Action', type: 'movie' },
    { apiUrl: MovieGneres.adventure, title: 'Adventure', type: 'movie' },
    { apiUrl: MovieGneres.scifi, title: 'Sci-Fi', type: 'movie' },
    { apiUrl: MovieGneres.comedy, title: 'Comedy', type: 'movie' },
    { apiUrl: MovieGneres.family, title: 'Family', type: 'movie' },
    { apiUrl: MovieGneres.animation, title: 'Animation', type: 'movie' },
    { apiUrl: MovieGneres.thriller, title: 'Thriller', type: 'movie' },
    { apiUrl: MovieGneres.crime, title: 'Crime', type: 'movie' },
    { apiUrl: MovieGneres.horror, title: 'Horror', type: 'movie' },
    { apiUrl: MovieGneres.mystery, title: 'Mystery', type: 'movie' },
    { apiUrl: MovieGneres.fantasy, title: 'Fantasy', type: 'movie' },
    { apiUrl: MovieGneres.drama, title: 'Drama', type: 'movie' },
  ], []);

  const seriesLists = useMemo(() => [
    { apiUrl: CatalogUrl.trendingSeries, title: 'Trending', type: 'series' },
    { apiUrl: TvGneres.actionAdventure, title: 'Action & Adventure', type: 'series' },
    { apiUrl: TvGneres.drama, title: 'Drama', type: 'series' },
    { apiUrl: TvGneres.crime, title: 'Crime', type: 'series' },
    { apiUrl: TvGneres.comedy, title: 'Comedy', type: 'series' },
    { apiUrl: TvGneres.mystery, title: 'Mystery', type: 'series' },
    { apiUrl: TvGneres.scifiFantsy, title: 'Sci-Fi & Fantasy', type: 'series' },
    { apiUrl: TvGneres.animation, title: 'Animation', type: 'series' },
    { apiUrl: TvGneres.family, title: 'Family', type: 'series' },
    { apiUrl: TvGneres.kids, title: 'Kids', type: 'series' },
  ], []);

  const activeLists = useMemo(() => {
    if (filter === 'all') return allLists;
    if (filter === 'movies') return movieLists;
    if (filter === 'series') return seriesLists;
    return [];
  }, [filter, allLists, movieLists, seriesLists]);

  const handleFilterChange = useCallback(async (newFilter: 'all' | 'movies' | 'series') => {
    if (await isHapticsSupported()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilter(newFilter);
  }, []);

  const handleCarouselItemPress = useCallback((item: any) => {
    const type = item.type == 'movie' ? 'movie' : 'series';
    router.push({ pathname: `/${type}/details`, params: { tmdbid: item.tmdbid } });
  }, []);

  const renderCatalogList = useCallback(({ item }: { item: (typeof activeLists)[number] }) => (
    <PosterList
      apiUrl={item.apiUrl}
      title={item.title}
      type={item.type as 'movie' | 'series'}
    />
  ), []);

  const listHeader = (
    <>
      <AppleTVCarousel
        filter={filter}
        onItemPress={handleCarouselItemPress}
        autoPlay={true}
        autoPlayInterval={6000}
        topInset={Platform.OS === 'ios' ? insets.top : 0}
      />
      <View style={styles.contentContainer}>
        <View style={styles.filtersContainer}>
          {filters.map((item) => (
            <NativeButton
              key={item.key}
              variant="text"
              style={[
                styles.filterButton,
                {
                  backgroundColor: filter === item.key ? '#ffffff' : colors.primaryCard,
                  borderColor: filter === item.key ? '#ffffff' : colors.primaryBorder,
                },
              ]}
              onPress={() => handleFilterChange(item.key as 'all' | 'movies' | 'series')}
              seedColor={colors.primary}
            >
              <Ionicons
                name={item.icon as any}
                size={18}
                color={filter === item.key ? '#000000' : colors.textMuted}
                style={styles.filterIcon}
              />
              <Text
                style={[
                  styles.filterButtonText,
                  { color: filter === item.key ? '#000000' : colors.textMuted },
                  filter === item.key && styles.filterButtonTextActive,
                ]}
              >
                {item.label}
              </Text>
            </NativeButton>
          ))}
        </View>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <StatusBar />
      <BlurGradientBackground />
      <FlatList
        key={filter}
        data={activeLists}
        keyExtractor={(item) => `${filter}-${item.apiUrl}`}
        renderItem={renderCatalogList}
        ListHeaderComponent={listHeader}
        ListFooterComponent={<BottomSpacing space={50} />}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={5}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginRight: 15,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterIcon: {
    marginRight: 6,
  },
  filterButtonText: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  filterButtonTextActive: {
    fontWeight: '600',
  },
  contentContainer: {
    marginTop: 16,
  },
});