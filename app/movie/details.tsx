import React, { useEffect, useState } from 'react';
import { Dimensions, Platform, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
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
import MediaLogo from '@/components/MediaLogo';

const EXPO_PUBLIC_TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

const MovieDetails = () => {
  const { moviedbid } = useLocalSearchParams();
  const [data, setData] = useState<any>(null);
  const [imdbid, setImdbId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/${moviedbid}?api_key=${EXPO_PUBLIC_TMDB_API_KEY}`
        );
        const result = await response.json();
        if (result) {
          const externalIds = await getExternalIds();
          setImdbId(externalIds.imdb_id);
          const logo = `https://images.metahub.space/logo/medium/${externalIds.imdb_id}/img`
          const movie = result;
          const movieData = {
            name: movie.title,
            background: `https://image.tmdb.org/t/p/original${movie.backdrop_path}`,
            poster: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
            logo: logo,
            genre: movie.genres.map((genre: any) => genre.name),
            released: movie.release_date,
            runtime: movie.runtime,
            imdbRating: movie.vote_average?.toFixed(1),
            releaseInfo: movie.release_date,
            description: movie.overview
          };
          setData(movieData);
        }
      } catch (error) {
        console.error('Error fetching movie details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [moviedbid]);

  const getExternalIds = async () => {
    const externalIdsResponse = await fetch(
      `https://api.themoviedb.org/3/movie/${moviedbid}/external_ids?api_key=${EXPO_PUBLIC_TMDB_API_KEY}`
    );
    const externalIdsResult = await externalIdsResponse.json();
    return externalIdsResult;
  }

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
    }
    router.push({
      pathname: '/stream/list',
      params: { imdbid: imdbid, type: 'movie', name: data.name, season: 0, episode: 0 },
    });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
      <StatusBar />

      <View style={[{
        flex: 1,
        flexDirection: isPortrait ? 'column' : 'row',
        marginTop: isPortrait ? 0 : 50
      }]}>
        <View style={[styles.posterContainer, { width: isPortrait ? '100%' : '50%' }]}>
          <MediaContentPoster background={isPortrait ? data.background : data.poster} isPortrait={isPortrait} />
        </View>

        <View style={[styles.detailsContainer, { width: isPortrait ? '100%' : '50%' }]}>
          <MediaLogo logo={data.logo} />
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
          {/* <MediaContentDetailsList
            released={data.released}
            country={data.country}
            director={data.director}
            writer={data.writer}
            cast={data.cast}
            releaseInfo={data.releaseInfo}
          /> */}
          <BottomSpacing space={50} />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  posterContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  landscapePosterContainer: {
  },
  detailsContainer: {
  },
  landscapeDetailsContainer: {
    flexWrap: 'wrap',
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
