import React, { useEffect, useState } from 'react';
import { ScrollView, Image, StyleSheet, Pressable, View as RNView, useWindowDimensions } from 'react-native';
import { ActivityIndicator, StatusBar, Text, View } from '@/components/Themed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported } from '@/utils/platform';
import { getYear } from '@/utils/Date';

const EXPO_PUBLIC_TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

const MoviesList = () => {
  const router = useRouter();
  const { apiUrl } = useLocalSearchParams();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;
  
  const posterWidth = isPortrait ? 100 : 150;
  const posterHeight = isPortrait ? 150 : 225;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const separator = apiUrl.includes('?') ? '&' : '?';
        const response = await fetch(`${apiUrl}${separator}api_key=${EXPO_PUBLIC_TMDB_API_KEY}`);
        const result = await response.json();
        if (result) {
          let list = [];
          if (result.results) {
            list = result.results
            .filter((item: any) => item.poster_path && item.backdrop_path)
            .map((item: any) => ({
              moviedbid: item.id,
              name: item.title || item.name,
              year: getYear(item.release_date || item.first_air_date),
              poster: `https://image.tmdb.org/t/p/w780${item.poster_path}`,
              background: `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`,
              imdbRating: item.vote_average?.toFixed(1),
              imdbid: item.imdb_id,
            }));
          }
          setData(list);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiUrl]);

  const MovieItem = ({ item }: { item: any }) => {
    const year = item.year?.split('–')[0] || item.year;

    const handlePress = async () => {
      if (isHapticsSupported()) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      }
      router.push({
        pathname: '/movie/details',
        params: { moviedbid: item.moviedbid || item.id },
      });
    };

    return (
      <Pressable
        style={styles.posterContainer}
        onPress={handlePress}
      >
        <Image 
          source={{ uri: isPortrait ? item.poster : item.poster }} 
          style={[styles.posterImage, {
            width: posterWidth,
            height: posterHeight,
          }]} 
        />
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.posterTitle}>
          {item.name}
        </Text>
        <Text style={styles.posterYear}>{`★ ${item.imdbRating}   ${year}`}</Text>
      </Pressable>
    );
  };

  return (
    <RNView style={styles.container}>
      <StatusBar />
      {loading ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" style={styles.activityIndicator} color="#535aff" />
          <Text style={styles.centeredText}>Loading</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          <RNView style={styles.moviesGrid}>
            {data.map((item, index) => (
              <MovieItem key={index.toString()} item={item} />
            ))}
          </RNView>
        </ScrollView>
      )}
    </RNView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 40,
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  scrollViewContent: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  moviesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  posterContainer: {
    padding: 10,
    marginBottom: 10,
  },
  posterImage: {
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
  activityIndicator: {
    marginBottom: 10,
    color: '#535aff',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centeredText: {
    fontSize: 18,
    textAlign: 'center',
  },
});

export default MoviesList;