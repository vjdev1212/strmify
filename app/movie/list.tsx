import React from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import MediaGrid from '@/components/MediaGrid';

const MoviesList = () => {
  const { apiUrl, title } = useLocalSearchParams<{ apiUrl?: string; title?: string }>();
  const pageTitle = title || 'Movies';

  return (
    <>
      <Stack.Screen options={{ title: pageTitle, headerTitleAlign: 'center', headerTransparent: false }} />
      <MediaGrid apiUrl={apiUrl ?? ''} detailsPath="/movie/details" />
    </>
  );
};

export default MoviesList;