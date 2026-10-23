import React from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import MediaGrid from '@/components/MediaGrid';

const SeriesList = () => {
  const { apiUrl, title } = useLocalSearchParams<{ apiUrl?: string; title?: string }>();
  const pageTitle = title || 'TV Shows';

  return (
    <>
      <Stack.Screen options={{ title: pageTitle, headerTitleAlign: 'center', headerTransparent: false }} />
      <MediaGrid apiUrl={apiUrl ?? ''} detailsPath="/series/details" />
    </>
  );
};

export default SeriesList;