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
import { useTheme } from '@/context/ThemeContext';

const EXPO_PUBLIC_TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

const posterCache = new Map<string, PosterItemData[]>();
const CACHE_DURATION = 5 * 60 * 1000;
const cacheTimestamps = new Map<string, number>();
const POSTER_IMAGE_SIZE = 'w780';
const SKELETON_DATA = [1, 2, 3, 4, 5];

interface PosterItemData {
  tmdbid: number;
  name: string;
  poster: string;
  background: string;
  year: string;
  imdbRating: string;
}

const PosterItem = React.memo(({
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
  const { colors } = useTheme();
  const [imgError, setImgError] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(false);
  const year = item.year?.split('–')[0] || item.year;

  useEffect(() => {
    setHapticsEnabled(isHapticsSupported());
  }, []);

  const handlePress = useCallback(async () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: `/${type}/details`, params: { tmdbid: item.tmdbid } });
  }, [hapticsEnabled, item.tmdbid, type]);

  const handlePressIn = useCallback(() => setIsPressed(true), []);
  const handlePressOut = useCallback(() => setIsPressed(false), []);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.posterContainer, { width: posterWidth, marginRight: spacing }, isPressed && styles.posterPressed]}
    >
      {!imgError ? (
        <Image
          source={{ uri: item.poster }}
          onError={() => setImgError(true)}
          style={[styles.posterImage, { width: posterWidth, height: posterHeight }]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.posterImage, { width: posterWidth, height: posterHeight, justifyContent: 'center', alignItems: 'center' }]}>
          <SvgXml xml={DefaultPosterImgXml} />
        </View>
      )}
      <Text numberOfLines={1} style={[styles.posterTitle, { width: posterWidth, color: colors.text }]}>{item.name}</Text>
      <Text style={[styles.posterYear, { color: colors.textMuted }]}>{year}</Text>
    </Pressable>
  );
});

const SkeletonPoster = React.memo(({ posterWidth, posterHeight, spacing, bgColor }: { posterWidth: number; posterHeight: number; spacing: number; bgColor: string }) => (
  <RNView style={[styles.posterContainer, { width: posterWidth, marginRight: spacing }]}>
    <RNView style={[styles.posterImage, { width: posterWidth, height: posterHeight, backgroundColor: bgColor }]} />
  </RNView>
));

const PosterList = ({ apiUrl, title, type }: { apiUrl: string; title: string; type: 'movie' | 'series' }) => {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const shortSide = Math.min(width, height);
  const isPortrait = height >= width;
  const [hapticsEnabled, setHapticsEnabled] = useState(false);

  useEffect(() => {
    setHapticsEnabled(isHapticsSupported());
  }, []);

  const [data, setData] = useState<PosterItemData[]>([]);
  const [loading, setLoading] = useState(true);

  const postersPerScreen = useMemo(() => {
    if (shortSide < 580) return isPortrait ? 3 : 5;
    if (shortSide < 1024) return isPortrait ? 6 : 8;
    if (shortSide < 1440) return isPortrait ? 7 : 9;
    return isPortrait ? 7 : 10;
  }, [isPortrait, shortSide]);
  const spacing = 10;
  const containerMargin = 15;

  const posterWidth = useMemo(() => {
    const totalSpacing = spacing * (postersPerScreen - 1);
    const totalMargins = containerMargin * 2;
    return (width - totalSpacing - totalMargins) / postersPerScreen;
  }, [width, postersPerScreen]);

  const posterHeight = posterWidth * 1.5;
  const listContentStyle = useMemo(() => ({ paddingRight: 4 }), []);

  useEffect(() => {
    const fetchData = async () => {
      const cachedData = posterCache.get(apiUrl);
      const cacheTime = cacheTimestamps.get(apiUrl);
      const now = Date.now();

      if (cachedData && cacheTime && (now - cacheTime) < CACHE_DURATION) {
        setData(cachedData);
        setLoading(false);
        return;
      }

      try {
        const separator = apiUrl.includes('?') ? '&' : '?';
        const response = await fetch(`${apiUrl}${separator}api_key=${EXPO_PUBLIC_TMDB_API_KEY}`);
        const result = await response.json();
        const collection = result?.results ?? [];

        const formatted = collection
          .filter((item: any) => item.poster_path && item.backdrop_path)
          .slice(0, 20)
          .map((item: any) => ({
            tmdbid: item.id,
            name: item.title || item.name,
            poster: `https://image.tmdb.org/t/p/${POSTER_IMAGE_SIZE}${item.poster_path}`,
            background: `https://image.tmdb.org/t/p/w780${item.backdrop_path}`,
            year: getYear(item.release_date || item.first_air_date),
            imdbRating: item.vote_average?.toFixed(1),
          }));

        posterCache.set(apiUrl, formatted);
        cacheTimestamps.set(apiUrl, now);
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
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: `/${type}/list`, params: { apiUrl } });
  }, [apiUrl, hapticsEnabled, type]);

  const renderSkeletonPoster = useCallback(() => (
    <SkeletonPoster posterWidth={posterWidth} posterHeight={posterHeight} spacing={spacing} bgColor={colors.backgroundOverlay} />
  ), [colors.backgroundOverlay, posterHeight, posterWidth]);

  const renderPosterItem = useCallback(({ item }: { item: PosterItemData }) => (
    <PosterItem item={item} posterWidth={posterWidth} posterHeight={posterHeight} type={type} spacing={spacing} />
  ), [posterHeight, posterWidth, type]);

  const keyExtractor = useCallback((item: PosterItemData, index: number) => `${item.tmdbid}-${index}`, []);
  const skeletonKeyExtractor = useCallback((_: number, index: number) => `skeleton-${index}`, []);

  if (loading) {
    return (
      <RNView style={styles.container}>
        <RNView style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </RNView>
        <FlatList
          data={SKELETON_DATA}
          horizontal
          renderItem={renderSkeletonPoster}
          keyExtractor={skeletonKeyExtractor}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={listContentStyle}
        />
      </RNView>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <RNView style={styles.container}>
      <RNView style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Pressable onPress={handleSeeAllPress} style={styles.seeAllButton}>
          <Text style={[styles.seeAllText, { color: colors.textMuted }]}>See All</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.chevronIcon} />
        </Pressable>
      </RNView>
      <FlatList
        data={data}
        horizontal
        renderItem={renderPosterItem}
        keyExtractor={keyExtractor}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={listContentStyle}
        initialNumToRender={postersPerScreen}
        maxToRenderPerBatch={postersPerScreen}
        windowSize={3}
      />
    </RNView>
  );
};

const styles = StyleSheet.create({
  container: { paddingTop: 10, marginBottom: 20, marginHorizontal: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5, alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '500', letterSpacing: 0.2 },
  seeAllButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 4 },
  seeAllText: { fontSize: 15, fontWeight: '500', letterSpacing: -0.1 },
  chevronIcon: { marginLeft: 2 },
  posterContainer: { marginBottom: 10 },
  posterPressed: { opacity: 0.7 },
  posterImage: { borderRadius: 6, overflow: 'hidden' },
  posterTitle: { marginTop: 10, fontSize: 14, fontWeight: '500', letterSpacing: -0.2, lineHeight: 20 },
  posterYear: { marginTop: 4, fontSize: 12, fontWeight: '500', letterSpacing: -0.1 },
});

export default PosterList;
