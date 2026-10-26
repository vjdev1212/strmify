import { ActivityIndicator, StatusBar, Text, TextInput, View } from '@/components/Themed';
import MediaGrid, { GENRE_NAMES, type MediaGridItem } from '@/components/MediaGrid';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { systemDarkBackground } from '@/constants/theme';

const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const SEARCH_ACCENT = '#0A84FF';
type SearchFilter = 'all' | 'movie' | 'series';

interface TMDBSearchItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  imdb_id?: string;
  genre_ids?: number[];
  popularity?: number;
}

function toMediaItem(item: TMDBSearchItem, type: 'movie' | 'series'): MediaGridItem {
  const date = item.release_date || item.first_air_date || '';
  return {
    tmdbid: item.id,
    name: item.title || item.name || 'Untitled',
    year: date ? date.slice(0, 4) : '',
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : '',
    background: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
    imdbRating: item.vote_average?.toFixed(1),
    imdbid: item.imdb_id,
    genres: (item.genre_ids ?? [])
      .map((genreId) => GENRE_NAMES[genreId])
      .filter((genre): genre is string => Boolean(genre)),
    type,
    popularity: item.popularity ?? 0,
  };
}

async function fetchSearchResults(
  query: string,
  signal: AbortSignal,
): Promise<MediaGridItem[]> {
  if (!TMDB_API_KEY) {
    throw new Error('Search is unavailable because the TMDB API key is not configured.');
  }

  const encodedQuery = encodeURIComponent(query);
  const endpoints = [
    { type: 'movie' as const, path: 'movie' },
    { type: 'series' as const, path: 'tv' },
  ];
  const responses = await Promise.all(
    endpoints.map(async ({ type, path }) => {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/${path}?query=${encodedQuery}&include_adult=false&api_key=${TMDB_API_KEY}`,
        { signal },
      );
      if (!response.ok) {
        throw new Error(`Search request failed (${response.status}). Please try again.`);
      }
      const result = (await response.json()) as { results?: TMDBSearchItem[] };
      return (result.results ?? []).map((item) => toMediaItem(item, type));
    }),
  );

  const items = responses
    .flat()
    .sort((left, right) => (right.popularity ?? 0) - (left.popularity ?? 0));
  return items;
}

const SearchScreen = () => {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaGridItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState<SearchFilter>('all');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const trimmedQuery = useMemo(() => query.trim(), [query]);
  const filteredResults = useMemo(
    () => selectedFilter === 'all'
      ? results
      : results.filter((item) => item.type === selectedFilter),
    [results, selectedFilter],
  );

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!trimmedQuery) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setResults([]);
    setError(null);
    setLoading(true);

    const timeout = setTimeout(() => {
      void fetchSearchResults(trimmedQuery, controller.signal)
        .then((items) => {
          setResults(items);
        })
        .catch((fetchError: unknown) => {
          if (controller.signal.aborted) return;
          setError(fetchError instanceof Error ? fetchError.message : 'Unable to search right now.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [retryCount, trimmedQuery]);

  const clearSearch = () => {
    setQuery('');
  };
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelectedFilter('all');
  };
  const showFilters = Boolean(trimmedQuery) && !loading && !error && !keyboardVisible;

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[styles.container, { backgroundColor: systemDarkBackground }]}
    >
      <StatusBar />
      <Stack.Screen
        options={{
          headerShown: Platform.OS !== 'web',
          headerBackVisible: false,
          headerTransparent: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: systemDarkBackground },
          headerUserInterfaceStyle: 'dark',
          headerTintColor: colors.text,
          headerTitle: 'Search',
          headerSearchBarOptions: {
            placeholder: 'Search movies or series',
            autoCapitalize: 'none',
            barTintColor: '#1C1C1E',
            textColor: '#FFFFFF',
            hintTextColor: '#8E8E93',
            headerIconColor: '#FFFFFF',
            tintColor: '#0A84FF',
            hideWhenScrolling: false,
            onChangeText: (event) => handleQueryChange(event.nativeEvent.text),
            onFocus: () => setKeyboardVisible(true),
            onBlur: () => setKeyboardVisible(false),
            onCancelButtonPress: clearSearch,
            onSearchButtonPress: (event) => handleQueryChange(event.nativeEvent.text),
          },
        }}
      />
      {Platform.OS === 'web' && (
        <View style={styles.webSearchHeader}>
          <View style={styles.webSearchField}>
            <Ionicons name="search-outline" size={22} color={colors.text} />
            <TextInput
              accessibilityLabel="Search movies or series"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardAppearance="dark"
              onChangeText={handleQueryChange}
              onFocus={() => setKeyboardVisible(true)}
              onBlur={() => setKeyboardVisible(false)}
              placeholder="Search movies or series"
              placeholderTextColor={colors.textDim}
              returnKeyType="search"
              style={[styles.webSearchInput, { color: colors.text }]}
              value={query}
            />
            {query.length > 0 && (
              <Pressable
                accessibilityLabel="Clear search text"
                accessibilityRole="button"
                hitSlop={8}
                onPress={clearSearch}
              >
                <Ionicons name="close-circle" size={20} color="#D1D1D6" />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {showFilters && (
        <View accessibilityRole="tablist" style={styles.filterBar}>
          {([
            { id: 'all', label: 'All' },
            { id: 'movie', label: 'Movies' },
            { id: 'series', label: 'TV Shows' },
          ] as const).map((filter) => {
            const selected = selectedFilter === filter.id;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                key={filter.id}
                onPress={() => setSelectedFilter(filter.id)}
                style={[
                  styles.filterButton,
                  selected && styles.selectedFilterButton,
                ]}
              >
                <Text style={[
                  styles.filterLabel,
                  { color: selected ? '#000000' : colors.textMuted },
                ]}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.resultsContainer}>
        {loading ? (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={SEARCH_ACCENT} />
          </View>
        ) : error ? (
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, { color: colors.textMuted }]}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => setRetryCount((count) => count + 1)}>
              <Text style={[styles.retryText, { color: SEARCH_ACCENT }]}>Try again</Text>
            </Pressable>
          </View>
        ) : trimmedQuery && filteredResults.length > 0 ? (
          <MediaGrid
            compact
            detailsPath="/movie/details"
            items={filteredResults}
            safeAreaEdges={['left', 'right']}
          />
        ) : trimmedQuery ? (
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, { color: colors.textMuted }]}>
              {results.length === 0
                ? 'No results found'
                : selectedFilter === 'movie'
                  ? 'No movies found'
                  : selectedFilter === 'series'
                    ? 'No TV shows found'
                    : 'No results found'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textDim }]}>
              Try searching with different keywords.
            </Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webSearchHeader: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  webSearchField: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    borderRadius: 24,
    backgroundColor: '#1C1C1E',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#38383A',
  },
  webSearchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    fontSize: 17,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
  },
  filterButton: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
  },
  selectedFilterButton: {
    backgroundColor: '#ffffff',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  statusText: {
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '500',
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    padding: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    fontSize: 14,
  },
});

export default SearchScreen;
