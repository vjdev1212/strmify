import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StatusBar } from '@/components/Themed';
import WatchHistory from '@/components/WatchHistory';
import { LibraryItem, libraryService } from '@/utils/LibraryService';
import BlurGradientBackground from '@/components/BlurGradientBackground';
import { SafeAreaView } from 'react-native-safe-area-context';

interface WatchHistoryItem {
  title: string;
  videoUrl: string;
  imdbid: string;
  type: string;
  season: string;
  episode: string;
  useVlcKit: string;
  progress: number;
  artwork: string;
  timestamp: number;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const CARD_HEIGHT = (CARD_WIDTH * 1.5);

type FilterType = 'all' | 'movie' | 'series';

const LibraryScreen: React.FC = () => {
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [filteredLibrary, setFilteredLibrary] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [animatedValues] = useState(new Map<string, Animated.Value>());

  useFocusEffect(
    useCallback(() => {
      loadLibrary();
    }, [])
  );

  const loadLibrary = async () => {
    try {
      const items = await libraryService.getLibrary();
      setLibrary(items);
      filterLibrary(items, activeFilter);
    } catch (error) {
      console.error('Failed to load library:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const filterLibrary = (items: LibraryItem[], filter: FilterType) => {
    if (filter === 'all') {
      setFilteredLibrary(items);
    } else {
      setFilteredLibrary(items.filter(item => item.type === filter));
    }
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    filterLibrary(library, filter);
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

  const handleItemPress = (item: LibraryItem) => {
    if (item.type === 'movie') {
      router.push({
        pathname: '/movie/details',
        params: { moviedbid: item.moviedbid }
      });
    } else {
      router.push({
        pathname: '/series/details',
        params: { moviedbid: item.moviedbid }
      });
    }
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
        useVlcKit: item.useVlcKit,
      },
    });
  };

  const renderFilterButton = (filter: FilterType, label: string, icon: string) => (
    <TouchableOpacity
      key={filter}
      style={[
        styles.filterButton,
        activeFilter === filter && styles.filterButtonActive,
      ]}
      onPress={() => handleFilterChange(filter)}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon as any}
        size={18}
        color={activeFilter === filter ? '#535aff' : '#999'}
      />
      <Text
        style={[
          styles.filterText,
          activeFilter === filter && styles.filterTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderLibraryItem = (item: LibraryItem, index: number) => {
    const itemKey = `${item.moviedbid}-${item.type}-${index}`;
    const animValue = getAnimatedValue(itemKey);

    return (
      <Animated.View
        key={itemKey}
        style={[
          styles.cardWrapper,
          {
            opacity: animValue,
            transform: [
              { scale: animValue },
              {
                translateY: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleItemPress(item)}
          activeOpacity={0.8}
        >
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.poster }}
              style={styles.poster}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.9)']}
              style={styles.gradient}
            />

            <View style={styles.typeBadge}>
              <Ionicons
                name={item.type === 'movie' ? 'film' : 'tv'}
                size={12}
                color="#fff"
              />
            </View>

            <TouchableOpacity
              style={styles.removeButton}
              onPress={(e) => {
                e.stopPropagation();
                removeFromLibrary(item, itemKey);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>

            {item.rating && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={10} color="#FFD700" />
                <Text style={styles.ratingText}>{item.rating}</Text>
              </View>
            )}
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            {item.year && (
              <Text style={styles.year}>{item.year}</Text>
            )}
            {item.genres && item.genres.length > 0 && (
              <Text style={styles.genres} numberOfLines={1}>
                {item.genres.slice(0, 2).join(' • ')}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="library-outline" size={80} color="#535aff" />
      <Text style={styles.emptyTitle}>Your Library is Empty</Text>
      <Text style={styles.emptyText}>
        Add movies and TV shows to your library to watch later
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar />
      <BlurGradientBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#535aff"
            colors={['#535aff']}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Library</Text>
          <Text style={styles.headerSubtitle}>
            {library.length} {library.length === 1 ? 'item' : 'items'}
          </Text>
        </View>

        <View style={styles.filterContainer}>
          {renderFilterButton('all', 'All', 'grid-outline')}
          {renderFilterButton('movie', 'Movies', 'film-outline')}
          {renderFilterButton('series', 'TV Shows', 'tv-outline')}
        </View>

        <WatchHistory
          onItemSelect={handleWatchHistoryItemSelect}
          type="all"
        />

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : filteredLibrary.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.grid}>
            {filteredLibrary.map((item, index) =>
              renderLibraryItem(item, index)
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(83, 90, 255, 0.15)',
    borderColor: 'rgba(83, 90, 255, 0.3)',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999',
  },
  filterTextActive: {
    color: '#535aff',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginBottom: 8,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: CARD_HEIGHT,
    position: 'relative',
  },
  poster: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2a2a2a',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(83, 90, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 6,
    backdropFilter: 'blur(10px)',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  ratingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  year: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  genres: {
    fontSize: 11,
    opacity: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.6,
  },
});

export default LibraryScreen;