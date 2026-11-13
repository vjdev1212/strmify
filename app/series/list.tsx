import React, { useMemo } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { MediaGrid } from '@vjdev1212/media-ui-kit';
import type { MediaGridItem } from '@vjdev1212/media-ui-kit';
import { libraryService } from '@/utils/LibraryService';
import { showAlert } from '@/utils/platform';

const SeriesList = () => {
  const {
    apiUrl,
    title,
    minimumPopularity: minimumPopularityParam,
    mediaType,
    movieApiUrl,
    seriesApiUrl,
  } = useLocalSearchParams<{
    apiUrl?: string;
    title?: string;
    minimumPopularity?: string;
    mediaType?: string;
    movieApiUrl?: string;
    seriesApiUrl?: string;
  }>();
  const parsedMinimumPopularity = minimumPopularityParam === undefined
    ? undefined
    : Number(minimumPopularityParam);
  const minimumPopularity = parsedMinimumPopularity !== undefined
    && Number.isFinite(parsedMinimumPopularity)
    && parsedMinimumPopularity >= 0
    ? parsedMinimumPopularity
    : undefined;
  const pageTitle = title || 'TV Shows';
  const isMixedList = mediaType === 'any';
  const sources = useMemo(() => (
    isMixedList
      ? [
        ...(movieApiUrl ? [{ apiUrl: movieApiUrl, mediaType: 'movie' as const }] : []),
        ...(seriesApiUrl ? [{ apiUrl: seriesApiUrl, mediaType: 'series' as const }] : []),
      ]
      : undefined
  ), [isMixedList, movieApiUrl, seriesApiUrl]);

  return (
    <>
      <Stack.Screen options={{ title: pageTitle, headerTitle: pageTitle, headerTitleAlign: 'left', headerTransparent: false, headerShadowVisible: false }} />
      <MediaGrid
        apiUrl={apiUrl ?? ''}
        apiKey={process.env.EXPO_PUBLIC_TMDB_API_KEY}
        mediaType={isMixedList ? 'any' : 'series'}
        sources={sources}
        minimumPopularity={minimumPopularity}
        onItemPress={(item) => {
          const type = item.type === 'movie' ? 'movie' : 'series';
          router.push({ pathname: `/${type}/details`, params: { tmdbid: String(item.tmdbid) } });
        }}
        onAddToWatchlist={(item: MediaGridItem) => {
          const type = item.type === 'movie' ? 'movie' : 'series';
          return libraryService.addToLibrary({
            id: `${type}-${item.tmdbid}`,
            tmdbid: String(item.tmdbid),
            type,
            title: item.name,
            poster: item.poster,
            backdrop: item.background,
            year: item.year,
            rating: item.imdbRating,
            genres: item.genres,
          });
        }}
        onActionError={showAlert}
      />
    </>
  );
};

export default SeriesList;