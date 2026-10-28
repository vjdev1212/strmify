import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Image,
  ScrollView as RNScrollView,
  StyleSheet,
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
import { NativeButton } from '@/components/native-ui-controls';
import PosterArtwork from '@/components/PosterArtwork';
import { radius, spacing, typography } from '@/constants/theme';

const EXPO_PUBLIC_TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

const posterCache = new Map<string, PosterItemData[]>();
const CACHE_DURATION = 5 * 60 * 1000;
const cacheTimestamps = new Map<string, number>();
const POSTER_IMAGE_SIZE = 'w500';
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
  cardHeight,
  type,
}: {
  item: PosterItemData;
  posterWidth: number;
  posterHeight: number;
  cardHeight: number;
  type: 'movie' | 'series';
}) => {
  const { colors } = useTheme();
  const [imgError, setImgError] = useState(false);
  const year = item.year?.split('–')[0] || item.year;

  const handlePress = useCallback(() => {
    if (isHapticsSupported()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: `/${type}/details`, params: { tmdbid: item.tmdbid } });
  }, [item.tmdbid, type]);

  return (
    <NativeButton
      variant="text"
      onPress={handlePress}
      style={{ width: posterWidth, height: cardHeight, flexShrink: 0 }}
      seedColor={colors.primary}
    >
      <PosterArtwork key={item.poster} style={{ width: posterWidth, height: posterHeight }}>
        {(onImageLoad) => !imgError ? (
          <Image
            source={{ uri: item.poster }}
            onLoad={onImageLoad}
            onError={() => setImgError(true)}
            style={{ width: posterWidth, height: posterHeight }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ width: posterWidth, height: posterHeight, justifyContent: 'center', alignItems: 'center' }}>
            <SvgXml xml={DefaultPosterImgXml} />
          </View>
        )}
      </PosterArtwork>
      <Text numberOfLines={1} style={[styles.posterTitle, { width: posterWidth, color: colors.text }]}>{item.name}</Text>
      <Text style={[styles.posterYear, { color: colors.textMuted }]}>{year}</Text>
    </NativeButton>
  );
});

const SkeletonPoster = React.memo(({ posterWidth, posterHeight, cardHeight, bgColor }: {
  posterWidth: number;
  posterHeight: number;
  cardHeight: number;
  bgColor: string;
}) => (
  <RNView style={{ width: posterWidth, height: cardHeight, flexShrink: 0 }}>
  <PosterArtwork style={{ width: posterWidth, height: posterHeight, backgroundColor: bgColor }} />
  </RNView>
));

const PosterList = ({
  apiUrl,
  title,
  type,
  compact = false,
}: {
  apiUrl: string;
  title: string;
  type: 'movie' | 'series';
  compact?: boolean;
}) => {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const shortSide = Math.min(width, height);
  const isPortrait = height >= width;

  const [data, setData] = useState<PosterItemData[]>([]);
  const [loading, setLoading] = useState(true);

  const postersPerScreen = useMemo(() => {
    if (shortSide < 580) return isPortrait ? 3 : 5;
    if (shortSide < 1024) return isPortrait ? 6 : 8;
    if (shortSide < 1440) return isPortrait ? 7 : 9;
    return isPortrait ? 7 : 10;
  }, [isPortrait, shortSide]);
  const posterGap = spacing.sm + 4;
  const containerMargin = compact ? spacing.mdLg : spacing.md;

  const posterWidth = useMemo(() => {
    const totalSpacing = posterGap * (postersPerScreen - 1);
    const totalMargins = containerMargin * 2;
    return (width - totalSpacing - totalMargins) / postersPerScreen;
  }, [containerMargin, width, postersPerScreen]);

  const posterHeight = posterWidth * 1.5;
  const posterCardHeight = posterHeight + 58;
  const listContentStyle = useMemo(
    () => ({ height: posterCardHeight + 10 }),
    [posterCardHeight],
  );

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

  const handleSeeAllPress = useCallback(() => {
    if (isHapticsSupported()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: `/${type}/list`, params: { apiUrl, title } });
  }, [apiUrl, title, type]);

  if (loading) {
    return (
      <RNView style={[styles.container, compact && styles.compactContainer]}>
        <RNView style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </RNView>
        <RNScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={listContentStyle}
          contentContainerStyle={{ flexDirection: 'row', gap: posterGap, paddingRight: containerMargin }}
        >
          {SKELETON_DATA.map((item, index) => (
            <SkeletonPoster
              key={`skeleton-${index}`}
              posterWidth={posterWidth}
              posterHeight={posterHeight}
              cardHeight={posterCardHeight}
              bgColor={colors.backgroundOverlay}
            />
          ))}
        </RNScrollView>
      </RNView>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <RNView style={[styles.container, compact && styles.compactContainer]}>
      <RNView style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <NativeButton variant="text" onPress={handleSeeAllPress} style={styles.seeAllButton} seedColor={colors.primary}>
          <Text style={[styles.seeAllText, { color: colors.textMuted }]}>See All</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.chevronIcon} />
        </NativeButton>
      </RNView>
      <RNScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={listContentStyle}
        contentContainerStyle={{ flexDirection: 'row', gap: posterGap, paddingRight: containerMargin }}
      >
        {data.map((item, index) => (
          <PosterItem
            key={`${item.tmdbid}-${index}`}
            item={item}
            posterWidth={posterWidth}
            posterHeight={posterHeight}
            cardHeight={posterCardHeight}
            type={type}
          />
        ))}
      </RNScrollView>
    </RNView>
  );
};

const styles = StyleSheet.create({
  container: { paddingTop: spacing.sm, marginBottom: spacing.lg, marginHorizontal: spacing.md },
  compactContainer: { paddingTop: spacing.xs, marginBottom: spacing.xs, marginHorizontal: spacing.mdLg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { ...typography.headline },
  seeAllButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 4 },
  seeAllText: { fontSize: 15, fontWeight: '500', letterSpacing: -0.1 },
  chevronIcon: { marginLeft: 2 },
  posterTitle: { height: 20, marginTop: spacing.sm, ...typography.caption, fontWeight: '600' },
  posterYear: { height: 18, marginTop: spacing.xs, ...typography.caption, color: '#8E8E93' },
});

export default React.memo(PosterList);
