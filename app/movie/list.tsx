import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Pressable, View as RNView, Platform, useWindowDimensions } from 'react-native';
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${apiUrl}?api_key=${EXPO_PUBLIC_TMDB_API_KEY}`);
        const result = await response.json();
        if (result) {
          let list = [];
          if (result.results) {
            list = result.results.map((item: any) => ({
              moviedbid: item.id,
              name: item.title || item.name,
              year: getYear(item.release_date || item.first_air_date),
              poster: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
              background: `https://image.tmdb.org/t/p/w500${item.backdrop_path}`,
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

  const renderItem = ({ item }: any) => {
    const year = item.year?.split('–')[0] || item.year;

    const handlePress = async () => {
      if (isHapticsSupported()) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      } router.push({
        pathname: '/movie/details',
        params: { moviedbid: item.moviedbid || item.id },
      })
    };

    return (
      <RNView>
        <Pressable
          style={styles.posterContainer}
          onPress={handlePress}
        >
          <Image source={{ uri: isPortrait ? item.poster : item.background }} style={[styles.posterImage, {
            width: isPortrait ? 100 : 200,
            height: isPortrait ? 150 : 110,
          }]} />
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.posterTitle}>
            {item.name}
          </Text>
          <Text style={styles.posterYear}>{year}</Text>
        </Pressable>
      </RNView>
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
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          numColumns={isPortrait ? 3 : 6}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.posterList}
        />
      )}
    </RNView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 20,
    padding: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  posterList: {
    paddingVertical: 20
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
