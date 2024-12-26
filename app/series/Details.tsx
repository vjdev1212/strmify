import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from '../../components/Themed';
import MediaContentDescription from '@/components/MediaContentDescription';
import MediaContentDetailsList from '@/components/MediaContentDetailsList';
import MediaContentHeader from '@/components/MediaContentHeader';
import MediaContentPoster from '@/components/MediaContentPoster';
import SeasonEpisodeList from '@/components/SeasonEpisodeList';
import BottomSpacing from '@/components/BottomSpacing';

const SeriesDetails = () => {
  const { imdbid } = useLocalSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await fetch(
          `https://v3-cinemeta.strem.io/meta/series/${imdbid}.json`
        );
        const result = await response.json();
        if (result.meta) {
          setData(result.meta);
        }
      } catch (error) {
        console.error('Error fetching series details:', error);
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
        <Text style={styles.centeredText}>No series details available</Text>
      </View>
    );
  }

  const handleEpisodeSelect = (season: number, episode: number) => {
    router.push({
      pathname: '/stream/list',
      params: { imdbid: data.imdb_id, type: 'series', season: season, episode: episode },
    });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
      <MediaContentPoster background={data.background} logo={data.logo} />
      <MediaContentHeader
        name={data.name}
        genre={data.genre || data.genres}
        released={data.released}
        runtime={data.runtime}
        imdbRating={data.imdbRating}
        releaseInfo={data.releaseInfo}
      />
      <MediaContentDescription description={data.description} />
      <MediaContentDetailsList
        released={data.released}
        country={data.country}
        director={data.director}
        writer={data.writer}
        cast={data.cast}
        releaseInfo={data.releaseInfo}
      />
      <SeasonEpisodeList
        videos={data.videos}
        onEpisodeSelect={handleEpisodeSelect} // Pass the haptic feedback function
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

export default SeriesDetails;
