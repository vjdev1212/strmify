import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Pressable,
  View as RNView,
  Animated,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Text, View } from './Themed';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics'; // Importing Haptics for haptic feedback
import { isHapticsSupported } from '@/utils/platform';
import { getYear } from '@/utils/Date';
import { useColorScheme } from './useColorScheme';

const EXPO_PUBLIC_TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

const SkeletonLoader = () => {
  const colorScheme = useColorScheme();
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;

  return (
    <RNView style={styles.skeletonContainer}>
      <RNView
        style={[
          styles.skeletonImage,
          {
            backgroundColor: colorScheme === 'dark' ? '#0f0f0f' : '#f0f0f0',
            width: isPortrait ? 100 : 140,
            height: isPortrait ? 150 : 200,
          },
        ]}
      />
    </RNView>
  );
};

const PosterList = ({
  apiUrl,
  title,
  type,
  layout = 'horizontal',
}: {
  apiUrl: string;
  title: string;
  type: 'movie' | 'series';
  layout?: 'horizontal' | 'vertical';
}) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const colorScheme = useColorScheme();
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${apiUrl}?api_key=${EXPO_PUBLIC_TMDB_API_KEY}`);
        const result = await response.json();
        const collection = result.results;
        let list = [];
        if (type === 'movie') {
          list = collection.map((movie: any) => ({
            moviedbid: movie.id,
            name: movie.title,
            poster: `https://image.tmdb.org/t/p/w780${movie.poster_path}`,
            background: `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`,
            year: getYear(movie.release_date),
            imdbRating: movie.vote_average?.toFixed(1),
          }));
        } else {
          list = collection.map((series: any) => ({
            moviedbid: series.id,
            name: series.name,
            poster: `https://image.tmdb.org/t/p/w780${series.poster_path}`,
            background: `https://image.tmdb.org/t/p/w1280${series.backdrop_path}`,
            year: getYear(series.first_air_date),
            imdbRating: series.vote_average?.toFixed(1),
          }));
        }
        setData(list);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiUrl]);

  const handlePress = async (item: any) => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    router.push({
      pathname: type === 'movie' ? '/movie/details' : '/series/details',
      params: { moviedbid: item.moviedbid },
    });
  };

  const renderItem = ({ item }: any) => {
    const year =
      item.year && typeof item.year === 'string' && item.year.includes('–')
        ? item.year.split('–')[0]
        : item.year;

    // Trigger the fade-in animation when image is loaded
    const handleImageLoad = () => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Pressable
        style={[
          styles.posterContainer,
          layout === 'vertical' && styles.verticalContainer,
        ]}
        onPress={() => handlePress(item)}
      >
        <View>
          <Animated.Image
            source={{ uri: isPortrait ? item.poster : item.background }}
            style={[
              styles.posterImage,
              layout === 'vertical' ? styles.verticalImage : styles.horizontalImage,
              {
                opacity: fadeAnim,
                backgroundColor: colorScheme === 'dark' ? '#0f0f0f' : '#f0f0f0',
                width: isPortrait ? 100 : 200,
                height: isPortrait ? 150 : 110,
              },
            ]}
            onLoad={handleImageLoad}
          />
          <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.posterTitle, {
            maxWidth: isPortrait ? 100 : 200,
          }]}>
            {item.name}
          </Text>
          <Text style={[styles.posterYear, {
            color: colorScheme === 'dark' ? '#afafaf' : '#303030',
          }]}>{`★ ${item.imdbRating}   ${year}`}</Text>
        </View>
      </Pressable>
    );
  };

  const handleSeeAllPress = async () => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    router.push({
      pathname: `/${type}/list`,
      params: { apiUrl, title, type },
    });
  };

  return (
    <RNView style={styles.container}>
      <RNView style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={handleSeeAllPress}>
          <Text style={styles.seeAllText}>See All</Text>
        </Pressable>
      </RNView>

      {loading ? (
        <FlatList
          data={new Array(10).fill(null)} // Skeleton loader
          renderItem={() => <SkeletonLoader />}
          keyExtractor={(_, index) => index.toString()}
          horizontal={layout === 'horizontal'}
          showsHorizontalScrollIndicator={false}
          numColumns={layout === 'vertical' ? 2 : 1}
        />
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          horizontal={layout === 'horizontal'}
          showsHorizontalScrollIndicator={false}
          numColumns={layout === 'vertical' ? 2 : 1}
        />
      )}
    </RNView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  posterContainer: {
    padding: 10,
  },
  verticalContainer: {
    flex: 1,
    marginBottom: 10,
  },
  posterImage: {
    borderRadius: 8,
  },
  horizontalImage: {
    width: 100,
    height: 150,
    borderRadius: 8
  },
  verticalImage: {
    flex: 1,
    aspectRatio: 2 / 3,
  },
  posterTitle: {
    marginTop: 8,
    width: '100%',
    overflow: 'hidden',
    fontSize: 14,
  },
  posterYear: {
    marginTop: 4,
    fontSize: 12,
    color: '#888',
  },
  skeletonContainer: {
    marginRight: 15,
    width: 100,
    alignItems: 'center',
  },
  skeletonImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#888888',
    borderRadius: 8,
  },
});

export default PosterList;
