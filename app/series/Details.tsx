import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '../../components/Themed';
import MediaContentDescription from '@/components/MediaContentDescription';
import MediaContentDetailsList from '@/components/MediaContentDetailsList';
import MediaContentHeader from '@/components/MediaContentHeader';
import MediaContentPoster from '@/components/MediaContentPoster';
import PlayButton from '@/components/PlayButton';

const SeriesDetails = () => {
  const { imdbid } = useLocalSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await fetch(
          `https://v3-cinemeta.strem.io/meta/series/${imdbid}.json`
        );
        const result = await response.json();
        setData(result.meta);
      } catch (error) {
        console.error('Error fetching series details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [imdbid]);

  if (loading) {
    return <Text>Loading...</Text>;
  }

  if (!data) {
    return <Text>No series details available</Text>;
  }

  const { background, name, description, genre, runtime, released, imdbRating, country, director, writer, cast } = data;

  return (
    <ScrollView style={styles.container}>
      <MediaContentPoster background={background} />
      <MediaContentHeader name={name} genre={genre} runtime={runtime} imdbRating={imdbRating} />
      <PlayButton onPress={() => console.log('Play clicked')} />
      <MediaContentDescription description={description} />
      <MediaContentDetailsList
        released={released}
        country={country}
        director={director}
        writer={writer}
        cast={cast}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SeriesDetails;
