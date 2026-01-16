import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import MediaGrid from '@/components/MediaGrid';
import BottomSpacing from '@/components/BottomSpacing';

const MoviesList = () => {
  const { apiUrl } = useLocalSearchParams();

  return (
    <MediaGrid
      apiUrl={apiUrl as string}
      detailsPath="/movie/details" />
  );
};

export default MoviesList;