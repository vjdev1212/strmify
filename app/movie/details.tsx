import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StatusBar, Text, View } from '../../components/Themed';
import MediaContentDescription from '@/components/MediaContentDescription';
import MediaContentDetailsList from '@/components/MediaContentDetailsList';
import MediaContentHeader from '@/components/MediaContentHeader';
import MediaContentPoster from '@/components/MediaContentPoster';
import PlayButton from '@/components/PlayButton';
import * as Haptics from 'expo-haptics';
import BottomSpacing from '@/components/BottomSpacing';
import { isHapticsSupported } from '@/utils/platform';

const MovieDetails = () => {
  const { imdbid } = useLocalSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await fetch(
          `https://v3-cinemeta.strem.io/meta/movie/${imdbid}.json`
        );
        const result = await response.json();
        if (result.meta) {
          setData(result.meta);
        }
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
        <ActivityIndicator size="large" style={styles.activityIndicator} color="#535aff" />
        <Text style={styles.centeredText}>Loading</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.centeredText}>No movie details available</Text>
      </View>
    );
  }

  const handlePlayPress = async () => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    } router.push({
      pathname: '/stream/list',
      params: { imdbid: data.imdb_id, type: 'movie', name: data.name, season: 0, episode: 0 },
    });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
      <StatusBar/>
      <MediaContentPoster background={data.background} logo={data.logo} />
      <MediaContentHeader
        name={data.name}
        genre={data.genre || data.genres}
        released={data.released}
        runtime={data.runtime}
        imdbRating={data.imdbRating}
        releaseInfo={data.releaseInfo}
      />
      <PlayButton onPress={handlePlayPress} />
      <MediaContentDescription description={data.description} />
      <MediaContentDetailsList
        released={data.released}
        country={data.country}
        director={data.director}
        writer={data.writer}
        cast={data.cast}
        releaseInfo={data.releaseInfo}
      />
      <BottomSpacing space={50} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  activityIndicator: {
    marginBottom: 10,
    color: '#535aff',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centeredText: {
    fontSize: 18,
    textAlign: 'center',
  },
});

export default MovieDetails;
