import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import MediaGrid from '@/components/MediaGrid';

const SeriesList = () => {
  const { apiUrl } = useLocalSearchParams();

  return (
    <MediaGrid 
      apiUrl={apiUrl as string} 
      detailsPath="/series/details" 
    />
  );
};

export default SeriesList;