import { Text, ActivityIndicator, TextInput, View } from '@/components/Themed';
import { Link } from 'expo-router';
import { useState, useEffect } from 'react';
import { View as RNView } from 'react-native';
import { StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 
import { useColorScheme } from 'react-native'; 

const SearchScreen = () => {
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
      <Link href={{
        pathname: `/movie/details`,
        params: { imdbid: item.imdb_id || item.id }
      }}>
        <PosterContent item={item} />
      </Link>
    );
  };

  const renderSeriesPoster = ({ item }: { item: any }) => {
    return (
      <Link href={{
        pathname: `/series/details`,
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

  const clearSearch = () => {
    setQuery(''); 
  };

  const colorScheme = useColorScheme();

  return (
    <View style={styles.container}>
      <View style={styles.searchInputContainer}>
        <TextInput
          style={[styles.searchInput, colorScheme === 'dark' ? styles.darkSearchInput : styles.lightSearchInput]}
          placeholder="Search movies or series..."
          value={query}
          onChangeText={setQuery} 
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={24} color="gray" />
          </TouchableOpacity>
        )}
      </View>

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
  searchInputContainer: {
    position: 'relative',
    margin: 20,
    marginTop: 50,
  },
  searchInput: {
    height: 50,
    borderWidth: 0.75,
    borderRadius: 50,
    paddingLeft: 15,
    paddingRight: 40,
    borderColor: 'gray',
    fontSize: 16,
  },
  lightSearchInput: {
    backgroundColor: '#fff',
  },
  darkSearchInput: {
    backgroundColor: '#333',
  },
  clearButton: {
    position: 'absolute',
    right: 10,
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
    marginHorizontal: 15
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
