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
      <View style={styles.searchInputContainer}>
        <TextInput
          style={[styles.searchInput, styles.darkSearchInput]}
          placeholder="Search movies or series..."
          placeholderTextColor="#888888"
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <Pressable onPress={clearSearch} style={styles.clearIcon}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </Pressable>
        )}
      </View>

      {loading && <ActivityIndicator size="large" color="#535aff" style={styles.loader} />}

      <ScrollView showsVerticalScrollIndicator={false} style={styles.searchResultsContainer}>
        {!loading && !moviesUrl && !seriesUrl && (
          <View style={styles.centeredContainer}>
            <Ionicons name="search-outline" color="#535aff" size={70} style={styles.noResults} />
            <Text style={styles.noResultsText}>
              {query.length > 0 ? 'No results found.' : 'What would you like to watch today?'}
            </Text>
          </View>
        )}

        {moviesUrl && (
          <PosterList
            apiUrl={moviesUrl}
            title="Movies"
            type="movie"
          />
        )}

        {seriesUrl && (
          <PosterList
            apiUrl={seriesUrl}
            title="Series"
            type="series"
          />
        )}
      </ScrollView>
      <BottomSpacing space={50} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 30
  },
  searchInputContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 780,
    margin: 'auto',
  },
  searchInput: {
    height: 40,
    borderRadius: 25,
    paddingLeft: 20,
    paddingRight: 40,
    fontSize: 16,
  },
  darkSearchInput: {
    backgroundColor: '#1f1f1f',
    color: '#fff',
  },
  clearIcon: {
    position: 'absolute',
    right: 30,
    justifyContent: 'center',
    height: 40,
  },
  loader: {
    marginTop: 20
  },
  searchResultsContainer: {
    marginVertical: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginVertical: 20,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noResults: {
    marginTop: 100,
    paddingBottom: 20,
  },
  noResultsText: {
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: '5%',
    color: '#888',
  },
});

export default SearchScreen;
