import React from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { MediaGrid } from '@vjdev1212/media-ui-kit';
import type { MediaGridItem } from '@vjdev1212/media-ui-kit';
import { libraryService } from '@/utils/LibraryService';
import { showAlert } from '@/utils/platform';

const MoviesList = () => {
  const { apiUrl, title } = useLocalSearchParams<{ apiUrl?: string; title?: string }>();
  const pageTitle = title || 'Movies';

  return (
    <>
      <Stack.Screen options={{ title: pageTitle, headerTitle: pageTitle, headerTitleAlign: 'left', headerTransparent: true, headerShadowVisible: false }} />
      <MediaGrid
        apiUrl={apiUrl ?? ''}
        apiKey={process.env.EXPO_PUBLIC_TMDB_API_KEY}
        mediaType="movie"
        onItemPress={(item) => router.push({ pathname: '/movie/details', params: { tmdbid: String(item.tmdbid) } })}
        onAddToWatchlist={(item: MediaGridItem) => libraryService.addToLibrary({
          id: `movie-${item.tmdbid}`,
          tmdbid: String(item.tmdbid),
          type: 'movie',
          title: item.name,
          poster: item.poster,
          backdrop: item.background,
          year: item.year,
          rating: item.imdbRating,
          genres: item.genres,
        })}
        onActionError={showAlert}
      />
    </>
  );
};

export default MoviesList;