import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  View as RNView,
} from 'react-native';
import { Text, View } from './Themed';
import { router } from 'expo-router';
import { getYear } from '@/utils/Date';
import { SvgXml } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported } from '@/utils/platform';
import { DefaultPosterImgXml } from '@/utils/Svg';
import { Ionicons } from '@expo/vector-icons';

const EXPO_PUBLIC_TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

interface PosterItemData {
  moviedbid: number;
  name: string;
  poster: string;
  background: string;
  year: string;
  imdbRating: string;
}

const PosterItem = ({
  item,
  posterWidth,
  posterHeight,
  type,
  spacing,
}: {
  item: PosterItemData;
  posterWidth: number;
  posterHeight: number;
  type: 'movie' | 'series';
  spacing: number;
}) => {
  const [imgError, setImgError] = useState(false);
  const year = item.year?.split('–')[0] || item.year;

  const handlePress = async () => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: `/${type}/details`,
      params: { moviedbid: item.moviedbid },
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.posterContainer, { width: posterWidth, marginRight: spacing }]}
    >
      {!imgError ? (
        <Image
          source={{ uri: item.poster }}
          onError={() => setImgError(true)}
          style={[styles.posterImage, { width: posterWidth, height: posterHeight }]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.posterImage,
            {
              width: posterWidth,
              height: posterHeight,
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
        >
          <SvgXml xml={DefaultPosterImgXml} />
        </View>
      )}
      <Text numberOfLines={1} style={[styles.posterTitle, { width: posterWidth }]}>
        {item.name}
      </Text>
      <Text style={styles.posterYear}>{`★ ${item.imdbRating}   ${year}`}</Text>
    </Pressable>
  );
};

const PosterList = ({
  apiUrl,
  title,
  type,
}: {
  apiUrl: string;
  title: string;
  type: 'movie' | 'series';
}) => {
  const { width, height } = useWindowDimensions();
  const shortSide = Math.min(width, height);
  const isPortrait = height >= width;

  const [data, setData] = useState<PosterItemData[]>([]);
  const [loading, setLoading] = useState(true);

  // Device category based on shortSide
  const getPostersPerScreen = () => {
    if (shortSide < 580) return isPortrait ? 3 : 5;       // mobile
    if (shortSide < 1024) return isPortrait ? 6 : 8;      // tablet
    if (shortSide < 1440) return isPortrait ? 7 : 9;      // laptop
    return isPortrait ? 7 : 10;                           // desktop
  };

  const postersPerScreen = getPostersPerScreen();
  const spacing = 12;

  const containerMargin = 15;
  const posterWidth = useMemo(() => {
    const totalSpacing = spacing * (postersPerScreen - 1);
    const totalMargins = containerMargin * 2; // left + right
    return (width - totalSpacing - totalMargins) / postersPerScreen;
  }, [width, postersPerScreen]);

  const posterHeight = posterWidth * 1.5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const separator = apiUrl.includes('?') ? '&' : '?';
        const response = await fetch(`${apiUrl}${separator}api_key=${EXPO_PUBLIC_TMDB_API_KEY}`);
        const result = await response.json();
        const collection = result?.results ?? [];

        const formatted = collection
          .filter((item: any) => item.poster_path && item.backdrop_path)
          .map((item: any) => ({
            moviedbid: item.id,
            name: item.title || item.name,
            poster: `https://image.tmdb.org/t/p/w780${item.poster_path}`,
            background: `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`,
            year: getYear(item.release_date || item.first_air_date),
            imdbRating: item.vote_average?.toFixed(1),
          }));

        setData(formatted);
      } catch (error) {
        console.error('Error loading posters', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiUrl]);

  const handleSeeAllPress = useCallback(async () => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: `/${type}/list`,
      params: { apiUrl },
    });
  }, [apiUrl, type]);

  if (!data || data.length === 0) return null;

  return (
    <RNView style={styles.container}>
      <RNView style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={handleSeeAllPress}>
          <Text style={styles.seeAllText}>
            See All<Ionicons name="chevron-forward" size={16} color="#fff" />
          </Text>
        </Pressable>
      </RNView>

      <FlatList
        data={data}
        horizontal
        renderItem={({ item }) => (
          <PosterItem
            item={item}
            posterWidth={posterWidth}
            posterHeight={posterHeight}
            type={type}
            spacing={spacing}
          />
        )}
        keyExtractor={(item, index) => `${item.moviedbid}-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 4 }}
      />
    </RNView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    marginBottom: 20,
    marginHorizontal: 15
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
  },
  seeAllText: {
    fontSize: 16,
    fontWeight: '500',
  },
  posterContainer: {
    marginBottom: 10,
  },
  posterImage: {
    borderRadius: 8,
    backgroundColor: '#101010',
  },
  posterTitle: {
    marginTop: 8,
    fontSize: 14,
  },
  posterYear: {
    marginTop: 4,
    fontSize: 12,
    color: '#ccc',
  },
});

export default PosterList;
