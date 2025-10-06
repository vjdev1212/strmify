import { Text, ActivityIndicator, TextInput, View, StatusBar } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported } from '@/utils/platform';
import { getYear } from '@/utils/Date';
import BottomSpacing from '@/components/BottomSpacing';
import PosterList from '@/components/PosterList';
import { SafeAreaView } from 'react-native-safe-area-context';

const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const debounceTimeoutRef = useRef<any| null>(null);

  const [moviesUrl, setMoviesUrl] = useState<string | null>(null);
  const [seriesUrl, setSeriesUrl] = useState<string | null>(null);

  const urls = useMemo(() => {
    if (!query.trim()) return { movies: null, series: null };

    const encoded = encodeURIComponent(query);
    return {
      movies: `https://api.themoviedb.org/3/search/movie?query=${encoded}&api_key=${TMDB_API_KEY}`,
      series: `https://api.themoviedb.org/3/search/tv?query=${encoded}&api_key=${TMDB_API_KEY}`
    };
  }, [query]);

  useEffect(() => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // If query is empty, clear results immediately
    if (!query.trim()) {
      setMoviesUrl(null);
      setSeriesUrl(null);
      return;
    }

    // Debounce the search
    debounceTimeoutRef.current = setTimeout(() => {
      setMoviesUrl(urls.movies);
      setSeriesUrl(urls.series);
    }, 300);

    // Cleanup
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query, urls]);

  const clearSearch = useCallback(async () => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setQuery('');
  }, []);

  const emptyStateContent = useMemo(() => {
    const hasQuery = query.length > 0;
    return {
      title: hasQuery ? 'No results found' : 'Start your search',
      subtitle: hasQuery
        ? 'Try searching with different keywords'
        : 'What would you like to watch today?'
    };
  }, [query.length]);

  const handleTextChange = useCallback((text: string) => {
    setQuery(text);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar />

      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Search</Text>
        <Text style={styles.headerSubtitle}>Discover Movies and TV Shows</Text>
      </View>

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
            onChangeText={handleTextChange}
            submitBehavior="blurAndSubmit"
            autoCorrect={false}
            autoCapitalize="none"
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

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#535aff" />
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.contentContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {!loading && !moviesUrl && !seriesUrl && (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateIconContainer}>
              <Ionicons name="search-outline" color="#535aff" size={64} />
            </View>
            <Text style={styles.emptyStateTitle}>
              {emptyStateContent.title}
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              {emptyStateContent.subtitle}
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
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 30,
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
    paddingHorizontal: 15,
    paddingBottom: 24,
  },
  searchInputContainer: {
    maxWidth: 780,
    width: '100%',
    margin: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
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

export default SearchScreen;