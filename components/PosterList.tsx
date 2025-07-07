import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

// Types
interface MovieItem {
  moviedbid: number;
  name: string;
  poster: string;
  background: string;
  year: string;
  imdbRating: string;
}

interface PosterListProps {
  apiUrl: string;
  title: string;
  type: 'movie' | 'series';
  layout?: 'horizontal' | 'vertical';
}

interface PosterItemProps {
  item: MovieItem;
  layout?: 'horizontal' | 'vertical';
  type: string;
}

// Constants
const SKELETON_COUNT = 10;
const POSTER_SIZES = {
  portrait: { width: 100, height: 150 },
  landscape: { width: 150, height: 220 },
};
const COLORS = {
  skeleton: '#0f0f0f',
  posterYear: '#afafaf',
  fallbackText: '#888',
};

const SkeletonLoader = React.memo(() => {
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;
  const size = isPortrait ? POSTER_SIZES.portrait : POSTER_SIZES.landscape;

  return (
    <RNView style={styles.skeletonContainer}>
      <RNView
        style={[
          styles.skeletonImage,
          {
            backgroundColor: COLORS.skeleton,
            width: size.width,
            height: size.height,
          },
        ]}
      />
    </RNView>
  );
});

SkeletonLoader.displayName = 'SkeletonLoader';

const PosterItem = React.memo(({ item, layout, type }: PosterItemProps) => {
  const [imgError, setImgError] = useState(false);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;

  const year = useMemo(() => {
    if (item.year && typeof item.year === 'string' && item.year.includes('–')) {
      return item.year.split('–')[0];
    }
    return item.year;
  }, [item.year]);

  const posterSize = useMemo(() => {
    return isPortrait ? POSTER_SIZES.portrait : POSTER_SIZES.landscape;
  }, [isPortrait]);

  const handleImageLoad = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleImageError = useCallback(() => {
    setImgError(true);
  }, []);

  const handlePress = useCallback(async () => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    router.push({
      pathname: type === 'movie' ? '/movie/details' : '/series/details',
      params: { moviedbid: item.moviedbid },
    });
  }, [item.moviedbid, type]);

  const handleHoverIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1.1,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handleHoverOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const imageStyle = useMemo(() => [
    styles.posterImage,
    layout === 'vertical' ? styles.verticalImage : styles.horizontalImage,
    {
      opacity: fadeAnim,
      backgroundColor: COLORS.skeleton,
      width: posterSize.width,
      height: posterSize.height,
    },
  ], [fadeAnim, layout, posterSize]);

  const placeholderStyle = useMemo(() => [
    styles.posterImagePlaceHolder,
    layout === 'vertical' ? styles.verticalImage : styles.horizontalImage,
    {
      backgroundColor: COLORS.skeleton,
      width: 100,
      height: 150,
    },
  ], [layout]);

  return (
    <Pressable
      style={[styles.posterContainer, layout === 'vertical' && styles.verticalContainer]}
      onPress={handlePress}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {!imgError ? (
          <Animated.Image
            source={{ uri: item.poster }}
            onError={handleImageError}
            onLoad={handleImageLoad}
            style={imageStyle}
          />
        ) : (
          <View style={placeholderStyle}>
            <SvgXml xml={DefaultPosterImgXml} />
          </View>
        )}
      </Animated.View>

      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[styles.posterTitle, { maxWidth: 100 }]}
      >
        {item.name}
      </Text>
      <Text style={[styles.posterYear, { color: COLORS.posterYear }]}>
        {`★ ${item.imdbRating}   ${year}`}
      </Text>
    </Pressable>
  );
});

PosterItem.displayName = 'PosterItem';

const PosterList = ({
  apiUrl,
  title,
  type,
  layout = 'horizontal',
}: PosterListProps) => {
  const [data, setData] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}?api_key=${EXPO_PUBLIC_TMDB_API_KEY}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      const collection = result.results;
      
      if (!collection || !Array.isArray(collection)) {
        throw new Error('Invalid API response format');
      }

      let list: MovieItem[] = [];

      if (type === 'movie') {
        list = collection
          .filter((movie: any) => movie.poster_path && movie.backdrop_path)
          .map((movie: any) => ({
            moviedbid: movie.id,
            name: movie.title,
            poster: `https://image.tmdb.org/t/p/w780${movie.poster_path}`,
            background: `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`,
            year: getYear(movie.release_date),
            imdbRating: movie.vote_average?.toFixed(1) || 'N/A',
          }));
      } else {
        list = collection
          .filter((series: any) => series.poster_path && series.backdrop_path)
          .map((series: any) => ({
            moviedbid: series.id,
            name: series.name,
            poster: `https://image.tmdb.org/t/p/w780${series.poster_path}`,
            background: `https://image.tmdb.org/t/p/w1280${series.backdrop_path}`,
            year: getYear(series.first_air_date),
            imdbRating: series.vote_average?.toFixed(1) || 'N/A',
          }));
      }

      setData(list);
    } catch (error) {
      console.error('Error fetching data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, type]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSeeAllPress = useCallback(async () => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    router.push({
      pathname: `/${type}/list`,
      params: { apiUrl, title, type },
    });
  }, [apiUrl, title, type]);

  const renderPosterItem = useCallback(({ item }: { item: MovieItem }) => (
    <PosterItem item={item} layout={layout} type={type} />
  ), [layout, type]);

  const renderSkeletonItem = useCallback(() => <SkeletonLoader />, []);

  const keyExtractor = useCallback((item: MovieItem, index: number) => 
    item?.moviedbid?.toString() || index.toString(), []);

  const skeletonKeyExtractor = useCallback((item: any, index: number) => 
    `skeleton-${index}`, []);

  const skeletonData = useMemo(() => 
    new Array(SKELETON_COUNT).fill(null), []);

  const numColumns = layout === 'vertical' ? 2 : 1;

  if (!data || data.length === 0) {
    return null;
  }

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
          data={skeletonData}
          renderItem={renderSkeletonItem}
          keyExtractor={skeletonKeyExtractor}
          horizontal={layout === 'horizontal'}
          showsHorizontalScrollIndicator={false}
          numColumns={numColumns}
        />
      ) : (
        <FlatList
          data={data}
          renderItem={renderPosterItem}
          keyExtractor={keyExtractor}
          horizontal={layout === 'horizontal'}
          showsHorizontalScrollIndicator={false}
          numColumns={numColumns}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          getItemLayout={layout === 'horizontal' ? undefined : (data, index) => ({
            length: 200, // Approximate item height
            offset: 200 * index,
            index,
          })}
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
  posterImagePlaceHolder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterImage: {
    borderRadius: 8,
  },
  horizontalImage: {
    width: 100,
    height: 150,
    borderRadius: 8,
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
    color: COLORS.fallbackText,
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