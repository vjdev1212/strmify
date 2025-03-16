import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Pressable,
  View as RNView,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Text, View } from './Themed';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported } from '@/utils/platform';
import { getYear } from '@/utils/Date';
import { useColorScheme } from './useColorScheme';
import { SvgXml } from 'react-native-svg';
import { DefaultPosterImgXml } from '@/utils/Svg';

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

const PosterItem = ({ item, layout, type }: { item: any, layout?: 'horizontal' | 'vertical', type: string }) => {
  const [imgError, setImgError] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const colorScheme = useColorScheme();
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;

  const year =
    item.year && typeof item.year === 'string' && item.year.includes('–')
      ? item.year.split('–')[0]
      : item.year;

  const posterUri = isPortrait ? item.poster : item.background;

  const handleImageLoad = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = async () => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    router.push({
      pathname: type === 'movie' ? '/movie/details' : '/series/details',
      params: { moviedbid: item.moviedbid },
    });
  };

  return (
    <Pressable
      style={[
        styles.posterContainer,
        layout === 'vertical' && styles.verticalContainer,
      ]}
      onPress={handlePress}
    >
      <View>
        {!imgError ? (
          <Animated.Image
            source={{ uri: posterUri }}
            onError={() => setImgError(true)}
            style={[
              styles.posterImage,
              layout === 'vertical' ? styles.verticalImage : styles.horizontalImage,
              {
                opacity: fadeAnim,
                width: isPortrait ? 100 : 200,
                height: isPortrait ? 150 : 110,
              },
            ]}
            onLoad={handleImageLoad}
          />
        ) : (
          <View style={[styles.posterImagePlaceHolder,
          layout === 'vertical' ? styles.verticalImage : styles.horizontalImage,
          {
            opacity: fadeAnim,
            width: isPortrait ? 100 : 200,
            height: isPortrait ? 150 : 110,
          }]}>
            <SvgXml xml={DefaultPosterImgXml} />
          </View>
        )}
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            styles.posterTitle,
            {
              maxWidth: isPortrait ? 100 : 200,
            },
          ]}
        >
          {item.name}
        </Text>
        <Text
          style={[styles.posterYear]}>
          {`★ ${item.imdbRating}   ${year}`}
        </Text>
      </View>
    </Pressable >
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
  const [loading, setLoading] = useState(true);

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
    <>
      {
        data && data.length > 0 &&
        <RNView style={styles.container}>
          <RNView style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={handleSeeAllPress}>
              <Text style={styles.seeAllText}>See All</Text>
            </Pressable>
          </RNView>

          {loading ? (
            <FlatList
              data={new Array(10).fill(null)}
              renderItem={() => <SkeletonLoader />}
              keyExtractor={(_, index) => index.toString()}
              horizontal={layout === 'horizontal'}
              showsHorizontalScrollIndicator={false}
              numColumns={layout === 'vertical' ? 2 : 1}
            />
          ) : (
            <FlatList
              data={data}
              renderItem={({ item }) => <PosterItem item={item} layout={layout} type={type} />}
              keyExtractor={(item, index) => index.toString()}
              horizontal={layout === 'horizontal'}
              showsHorizontalScrollIndicator={false}
              numColumns={layout === 'vertical' ? 2 : 1}
            />
          )}
        </RNView>
      }
    </>

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
  posterImagePlaceHolder: {
    justifyContent: 'center',
    alignItems: 'center'
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
    color: '#fff',
  },
  skeletonContainer: {
    marginRight: 15,
    width: 100,
    alignItems: 'center',
  },
  skeletonImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#fff888',
    borderRadius: 8,
  },
});

export default PosterList;
