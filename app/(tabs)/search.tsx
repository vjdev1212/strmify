import { Text, ActivityIndicator, TextInput, View } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { View as RNView, SafeAreaView } from 'react-native';
import { StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';

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
        fetch(`https://v3-cinemeta.strem.io/catalog/movie/top/search=${query}.json`),
        fetch(`https://v3-cinemeta.strem.io/catalog/series/top/search=${query}.json`),
      ]);

      const moviesResult = await moviesResponse.json();
      const seriesResult = await seriesResponse.json();

      setMovies(moviesResult.metas || []);
      setSeries(seriesResult.metas || []);
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
    }, 1000);

    setDebounceTimeout(timeout);

    return () => {
      clearTimeout(timeout);
    };
  }, [query]);

  const renderMoviePoster = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity>
        <PosterContent item={item} type='movie' />
      </TouchableOpacity>
    );
  };

  const renderSeriesPoster = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity>
        <PosterContent item={item} type='series' />
      </TouchableOpacity>
    );
  };

  const PosterContent = ({ item, type }: { item: any, type: string }) => {
    const handlePress = async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(
        {
          pathname: type === 'movie' ? '/movie/details' : '/series/details',
          params: { imdbid: item.imdb_id || item.id }
        });
    };

    return (
      <SafeAreaView>
        <RNView>
          <TouchableOpacity style={styles.posterContainer} onPress={handlePress}>
            <Image source={{ uri: item.poster }} style={styles.posterImage} />
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.posterTitle}>
              {item.name}
            </Text>
            <Text style={styles.posterYear}>{item.releaseInfo}</Text>
          </TouchableOpacity>
        </RNView>
      </SafeAreaView>
    );
  };

  const clearSearch = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuery('');
    setMovies([]);
    setSeries([]);
  };

  const colorScheme = useColorScheme();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchInputContainer}>
        <TextInput
          style={[
            styles.searchInput,
            colorScheme === 'dark' ? styles.darkSearchInput : styles.lightSearchInput,
          ]}
          placeholder="Search movies or series..."
          placeholderTextColor={colorScheme === 'dark' ? '#AAA' : '#333'}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={24} color="gray" />
          </TouchableOpacity>
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
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingLeft: 20,
    borderColor: 'gray',
    fontSize: 14,
  },
  lightSearchInput: {
    backgroundColor: '#fff',
    color: '#000',
  },
  darkSearchInput: {
    backgroundColor: '#333',
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
    color: 'gray',
  },
});

export default SearchScreen;
