import { Text, ActivityIndicator, TextInput, View } from '@/components/Themed';
import { Link } from 'expo-router';
import { useState, useEffect } from 'react';
import { View as RNView } from 'react-native';
import { StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [movies, setMovies] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState(query);


  const fetchData = async () => {
    if (!debouncedQuery.trim()) return;
    setLoading(true);
    try {
      const [moviesResponse, seriesResponse] = await Promise.all([
        fetch(`https://v3-cinemeta.strem.io/catalog/movie/top/search=${debouncedQuery}.json`),
        fetch(`https://v3-cinemeta.strem.io/catalog/series/top/search=${debouncedQuery}.json`),
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
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);


    return () => clearTimeout(timer);
  }, [query]);


  useEffect(() => {
    fetchData();
  }, [debouncedQuery]);

  const renderMoviePoster = ({ item }: { item: any }) => {
    return (
      <Link href={{
        pathname: `/movie/Details`,
        params: { imdbid: item.imdb_id || item.id }
      }}>
        <PosterContent item={item} />
      </Link>
    );
  };

  const renderSeriesPoster = ({ item }: { item: any }) => {
    return (
      <Link href={{
        pathname: `/series/Details`,
        params: { imdbid: item.imdb_id || item.id }
      }}>
        <PosterContent item={item} />
      </Link>
    );
  };

  const PosterContent = ({ item }: { item: any }) => {
    return (
      <RNView>
        <TouchableOpacity style={styles.posterContainer}>
          <Image
            source={{ uri: item.poster }}
            style={styles.posterImage}
          />
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.posterTitle}>
            {item.name}
          </Text>
          <Text style={styles.posterYear}>{item.releaseInfo}</Text>
        </TouchableOpacity>
      </RNView>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search movies or series..."
        value={query}
        onChangeText={setQuery}
      />

      {loading && <ActivityIndicator size="large" color="#fc7703" style={styles.loader} />}

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  searchInput: {
    height: 50,
    borderWidth: 0.75,
    borderRadius: 12,
    margin: 20,
    marginTop: 50,
    paddingLeft: 15,
    borderColor: 'gray'
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
    marginHorizontal: 15
  },
  posterImage: {
    width: 100,
    height: 150,
    borderRadius: 8,
  },
  posterTitle: {
    textAlign: 'center',
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
