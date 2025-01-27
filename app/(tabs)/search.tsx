import { Text, ActivityIndicator, TextInput, View, StatusBar } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Platform, View as RNView, SafeAreaView } from 'react-native';
import { StyleSheet, FlatList, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported } from '@/utils/platform';
import { getYear } from '@/utils/Date';

const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

const SearchScreen = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [movies, setMovies] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  const fetchData = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const [moviesResponse, seriesResponse] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`),
        fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`),
      ]);

      const moviesResult = await moviesResponse.json();
      const seriesResult = await seriesResponse.json();

      const movieList = moviesResult.results.map((movie: any) => ({
        moviedbid: movie.id,
        name: movie.title,
        poster: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
        background: `https://image.tmdb.org/t/p/w500${movie.backdrop_path}`,
        year: getYear(movie.release_date),
      }));

      const seriesList = seriesResult.results.map((series: any) => ({
        moviedbid: series.id,
        name: series.name,
        poster: `https://image.tmdb.org/t/p/w500${series.poster_path}`,
        background: `https://image.tmdb.org/t/p/w500${series.backdrop_path}`,
        year: getYear(series.first_air_date),
      }));

      setMovies(movieList);
      setSeries(seriesList);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    const timeout = setTimeout(() => {
      fetchData();
    }, 500);

    setDebounceTimeout(timeout);

    return () => {
      clearTimeout(timeout);
    };
  }, [query]);

  const renderMoviePoster = ({ item }: { item: any }) => {
    return (
      <Pressable>
        <PosterContent item={item} type='movie' />
      </Pressable>
    );
  };

  const renderSeriesPoster = ({ item }: { item: any }) => {
    return (
      <Pressable>
        <PosterContent item={item} type='series' />
      </Pressable>
    );
  };

  const PosterContent = ({ item, type }: { item: any, type: string }) => {
    const handlePress = async () => {
      if (isHapticsSupported()) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      }
      router.push(
        {
          pathname: type === 'movie' ? '/movie/details' : '/series/details',
          params: { id: item.id }
        });
    };

    return (
      <SafeAreaView>
        <RNView>
          <Pressable style={styles.posterContainer} onPress={handlePress}>
            <Image source={{ uri: item.poster }} style={styles.posterImage} />
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.posterTitle}>
              {item.title || item.name}
            </Text>
            <Text style={styles.posterYear}>{item.year}</Text>
          </Pressable>
        </RNView>
      </SafeAreaView>
    );
  };

  const clearSearch = async () => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    setQuery('');
    setMovies([]);
    setSeries([]);
  };

  const isWeb = Platform.OS === 'web';
  const colorScheme = isWeb ? 'dark' : useColorScheme();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar />
      <View style={styles.searchInputContainer}>
        <TextInput
          style={[
            styles.searchInput,
            colorScheme === 'dark' ? styles.darkSearchInput : styles.lightSearchInput,
          ]}
          placeholder="Search movies or series..."
          placeholderTextColor={'#888888'}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <Pressable onPress={clearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={24} color="gray" />
          </Pressable>
        )}
      </View>

      {loading && <ActivityIndicator size="large" color="#535aff" style={styles.loader} />}

      {!loading && movies.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>Movies</Text>
          <FlatList
            data={movies}
            keyExtractor={(item, index) => `movie-${index}`}
            renderItem={renderMoviePoster}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {!loading && series.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>Series</Text>
          <FlatList
            data={series}
            keyExtractor={(item, index) => `series-${index}`}
            renderItem={renderSeriesPoster}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
  },
  searchInputContainer: {
    position: 'relative',
    marginTop: 30,
    paddingHorizontal: 20,
  },
  searchInput: {
    height: 40,
    borderRadius: 12,
    paddingLeft: 20,
    fontSize: 16,
  },
  lightSearchInput: {
    backgroundColor: '#f0f0f0',
    color: '#000',
  },
  darkSearchInput: {
    backgroundColor: '#1f1f1f',
    color: '#fff',
  },
  clearButton: {
    position: 'absolute',
    right: 35,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  loader: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    margin: 20,
  },
  posterContainer: {
    marginHorizontal: 15,
  },
  posterImage: {
    width: 100,
    height: 150,
    borderRadius: 8,
  },
  posterTitle: {
    marginTop: 8,
    fontSize: 14,
    maxWidth: 100,
  },
  posterYear: {
    marginTop: 4,
    fontSize: 12,
    color: '#888',
  },
});

export default SearchScreen;
