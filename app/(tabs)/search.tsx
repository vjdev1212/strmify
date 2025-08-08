import { Text, ActivityIndicator, TextInput, View, StatusBar } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { SafeAreaView, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported } from '@/utils/platform';
import { getYear } from '@/utils/Date';
import BottomSpacing from '@/components/BottomSpacing';
import PosterList from '@/components/PosterList';

const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

const SearchScreen = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState<any>(null);

  const [moviesUrl, setMoviesUrl] = useState<string | null>(null);
  const [seriesUrl, setSeriesUrl] = useState<string | null>(null);

  const fetchData = () => {
    if (!query.trim()) {
      setMoviesUrl(null);
      setSeriesUrl(null);
      return;
    }
    const encoded = encodeURIComponent(query);
    setMoviesUrl(`https://api.themoviedb.org/3/search/movie?query=${encoded}&api_key=${TMDB_API_KEY}`);
    setSeriesUrl(`https://api.themoviedb.org/3/search/tv?query=${encoded}&api_key=${TMDB_API_KEY}`);
  };

  useEffect(() => {
    if (debounceTimeout) clearTimeout(debounceTimeout);

    if (!query.trim()) {
      clearSearch();
      return;
    }

    const timeout = setTimeout(() => {
      fetchData();
    }, 500);

    setDebounceTimeout(timeout);

    return () => clearTimeout(timeout);
  }, [query]);

  const clearSearch = async () => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    setQuery('');
    setMoviesUrl(null);
    setSeriesUrl(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar />

      {/* Header Section */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Search</Text>
        <Text style={styles.headerSubtitle}>Discover Movies and TV Shows</Text>
      </View>

      {/* Search Input Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <View style={styles.searchIconContainer}>
            <Ionicons name="search-outline" size={20} color="#666" />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies or series..."
            placeholderTextColor="#666"
            value={query}
            onChangeText={setQuery}
            submitBehavior="blurAndSubmit"
          />
          {query.length > 0 && (
            <Pressable onPress={clearSearch} style={styles.clearButton}>
              <View style={styles.clearIconContainer}>
                <Ionicons name="close" size={16} color="#888" />
              </View>
            </Pressable>
          )}
        </View>
      </View>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#535aff" />
        </View>
      )}

      {/* Content Section */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.contentContainer}
        contentContainerStyle={styles.scrollContent}
      >
        {!loading && !moviesUrl && !seriesUrl && (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateIconContainer}>
              <Ionicons name="search-outline" color="#535aff" size={64} />
            </View>
            <Text style={styles.emptyStateTitle}>
              {query.length > 0 ? 'No results found' : 'Start your search'}
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              {query.length > 0
                ? 'Try searching with different keywords'
                : 'What would you like to watch today?'
              }
            </Text>
          </View>
        )}

        {moviesUrl && (
          <View style={styles.resultsSection}>
            <PosterList
              apiUrl={moviesUrl}
              title="Movies"
              type="movie"
            />
          </View>
        )}

        {seriesUrl && (
          <View style={styles.resultsSection}>
            <PosterList
              apiUrl={seriesUrl}
              title="Series"
              type="series"
            />
          </View>
        )}
      </ScrollView>
      <BottomSpacing space={50} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    fontWeight: '400',
  },
  searchSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  searchInputContainer: {
    maxWidth: 780,
    width: '100%',
    margin: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    height: 40,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIconContainer: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '400',
    outline: 'none'
  },
  clearButton: {
    marginLeft: 8,
  },
  clearIconContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginTop: -100,
  },
  emptyStateIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(83, 90, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    paddingLeft: 5,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  resultsSection: {
    marginBottom: 24,
  },
});

export default SearchScreen