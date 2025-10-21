import { router } from 'expo-router'; import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity
} from 'react-native';
import { StatusBar, Text } from '@/components/Themed';
import PosterList from '@/components/PosterList';
import BottomSpacing from '@/components/BottomSpacing';
import AppleTVCarousel from '@/components/PosterCarousel'; // Import the new carousel
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported } from '@/utils/platform';
import { CatalogUrl, MovieGneres, TvGneres } from '@/constants/Tmdb';
import WatchHistory from '@/components/WatchHistory';

export default function HomeScreen() {
  const [filter, setFilter] = useState<'all' | 'movies' | 'series'>('all');

  const filters = [
    { key: 'all', label: 'All', icon: 'apps' },
    { key: 'movies', label: 'Movies', icon: 'film-outline' },
    { key: 'series', label: 'Series', icon: 'tv-outline' }
  ];

  // All mode fixed curated list
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

  // Pick correct list based on filter
  const activeLists = useMemo(() => {
    if (filter === 'all') return allLists;
    if (filter === 'movies') return movieLists;
    if (filter === 'series') return seriesLists;
    return [];
  }, [filter, allLists, movieLists, seriesLists]);

  const handleFilterChange = async (newFilter: 'all' | 'movies' | 'series') => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setFilter(newFilter);
  };

  const handleCarouselItemPress = (item: any) => {
    const type = item.type == 'movie' ? 'movie' : 'series'
    router.push({
      pathname: `/${type}/details`,
      params: { moviedbid: item.moviedbid },
    });
  };

  const handleWatchHistoryItemPress = (item: any) => {
    router.push({
      pathname: '/stream/player',
      params: {
        videoUrl: item.videoUrl,
        title: item.title,
        imdbid: item.imdbid,
        type: item.type,
        season: item.season,
        episode: item.episode,
        useVlcKit: item.useVlcKit,
      },
    });
  };



  return (
    <View style={[styles.container]}>
      <StatusBar />
      {/* Scrollable content */}
      <ScrollView showsVerticalScrollIndicator={false} key={filter}>

        {/* Apple TV Carousel */}
        <AppleTVCarousel
          filter={filter}
          onItemPress={handleCarouselItemPress}
          autoPlay={true}
          autoPlayInterval={6000}
        />


        <View style={styles.contentContainer}>
          {/* Filter buttons - moved to overlay on carousel */}
          <View style={[styles.filtersContainer]}>
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
                  onPress={() => handleFilterChange(item.key as 'all' | 'movies' | 'series')}
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

          <WatchHistory onItemSelect={(item) => handleWatchHistoryItemPress(item)} />
          {activeLists.map((list, i) => (
            <PosterList
              key={`${filter}-${i}`}
              apiUrl={list.apiUrl}
              title={list.title}
              type={list.type as 'movie' | 'series'}
            />
          ))}
        </View>
        <BottomSpacing space={50} />
      </ScrollView>
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
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: '#1a1a1a',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(83, 90, 255, 0.5)',
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