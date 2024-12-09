import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from '../../components/Themed';
import MediaContentDescription from '@/components/MediaContentDescription';
import MediaContentDetailsList from '@/components/MediaContentDetailsList';
import MediaContentHeader from '@/components/MediaContentHeader';
import MediaContentPoster from '@/components/MediaContentPoster';
import PlayButton from '@/components/PlayButton';

const MovieDetails = () => {
  const { imdbid } = useLocalSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await fetch(
          `https://v3-cinemeta.strem.io/meta/movie/${imdbid}.json`
        );
        const result = await response.json();
        setData(result.meta);
      } catch (error) {
        console.error('Error fetching movie details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [imdbid]);

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" style={styles.activityIndicator} />
        <Text style={styles.centeredText}>Loading</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.centeredText}>No movies details available</Text>
      </View>
    );
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
  activityIndicator: {
    marginBottom: 10
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centeredText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default MovieDetails;
