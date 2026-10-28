import React from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import MediaGrid from '@/components/MediaGrid';

const MoviesList = () => {
  const { apiUrl, title } = useLocalSearchParams<{ apiUrl?: string; title?: string }>();
  const pageTitle = title || 'Movies';

  return (
    <>
      <Stack.Screen options={{ title: pageTitle, headerTitle: pageTitle, headerTitleAlign: 'left', headerTransparent: true, headerShadowVisible: false }} />
      <MediaGrid apiUrl={apiUrl ?? ''} detailsPath="/movie/details" />
    </>
  );
};

export default MoviesList;