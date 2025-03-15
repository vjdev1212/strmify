import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StatusBar, Text, View } from '../../components/Themed';
import MediaContentDescription from '@/components/MediaContentDescription';
import MediaContentHeader from '@/components/MediaContentHeader';
import MediaContentPoster from '@/components/MediaContentPoster';
import SearchButton from '@/components/SearchButton';
import * as Haptics from 'expo-haptics';
import BottomSpacing from '@/components/BottomSpacing';
import { isHapticsSupported } from '@/utils/platform';
import MediaLogo from '@/components/MediaLogo';
import MediaCastAndCrews from '@/components/MediaCastAndCrews';
import PosterList from '@/components/PosterList';
import { getColors } from 'react-native-image-colors';

const EXPO_PUBLIC_TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

const MovieDetails = () => {
  const { moviedbid } = useLocalSearchParams();
  const [data, setData] = useState<any>(null);
  const [imdbid, setImdbId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [cast, setCast] = useState<any[]>([]);
  const [gradientColors, setGradientColors] = useState<string[]>(['#000', '#000']);
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;
  const ref = useRef<ScrollView | null>(null);

  useFocusEffect(() => {
    if (ref.current) {
      ref.current.scrollTo({ y: 0, animated: true });
    }
  });

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/${moviedbid}?api_key=${EXPO_PUBLIC_TMDB_API_KEY}`
        );
        const result = await response.json();
        if (result) {
          const externalIds = await getExternalIds();
          const castAndCrews = await getCastandCrew();
          setCast(castAndCrews);
          setImdbId(externalIds.imdb_id);
          const logo = `https://images.metahub.space/logo/medium/${externalIds.imdb_id}/img`;
          const movie = result;
          const movieData = {
            name: movie.title,
            background: `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`,
            poster: `https://image.tmdb.org/t/p/w780${movie.poster_path}`,
            logo: logo,
            genre: movie.genres.map((genre: any) => genre.name),
            released: movie.release_date,
            runtime: movie.runtime,
            imdbRating: movie.vote_average?.toFixed(1),
            releaseInfo: movie.release_date,
            description: movie.overview
          };
          setData(movieData);

          const colors = await getColors(isPortrait ? movieData.background : movieData.poster, { cache: true });
          let extractedColors: [string, string] = ['', ''];
          if (colors.platform === 'ios') {
            extractedColors = [colors.primary || '#111111', colors.secondary || '#444444'];
          }
          else {
            extractedColors = [colors.vibrant || '#111111', colors.darkMuted || '#444444'];
          }
          setGradientColors(extractedColors);
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
  };

  const getCastandCrew = async () => {
    const castAndCrewsResponse = await fetch(
      `https://api.themoviedb.org/3/movie/${moviedbid}/credits?api_key=${EXPO_PUBLIC_TMDB_API_KEY}`
    );
    const castAndCrewResult = await castAndCrewsResponse.json();
    return castAndCrewResult.cast || [];
  };

  if (loading) {
    return (
      <LinearGradient colors={['#111111', '#222222']} start={[0, 0]} end={[1, 0]} style={{ flex: 1 }}>
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" style={styles.activityIndicator} color="#ffffff" />
          <Text style={styles.centeredText}>Loading</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!data) {
    return (
      <LinearGradient colors={['#111111', '#222222']} start={[0, 0]} end={[1, 0]} style={{ flex: 1 }}>
        <View style={styles.centeredContainer}>
          <Text style={styles.centeredText}>No movie details available</Text>
        </View>
      </LinearGradient>
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

    <ScrollView showsVerticalScrollIndicator={false} style={styles.container} ref={ref}>
      <LinearGradient colors={gradientColors as [string, string]}>
        <StatusBar />

        <View style={[{
          flex: 1,
          flexDirection: isPortrait ? 'column' : 'row',
          marginTop: isPortrait ? 0 : '5%',
          justifyContent: 'center',
        }]}>
          <View style={[styles.posterContainer, {
            width: isPortrait ? '100%' : '30%',
            padding: isPortrait ? null : '3%'
          }]}>
            <MediaContentPoster background={isPortrait ? data.background : data.poster} isPortrait={isPortrait} />
          </View>

          <View style={[styles.detailsContainer, {
            width: isPortrait ? '100%' : '60%',
            paddingHorizontal: isPortrait ? null : 5
          }]}>
            <MediaLogo logo={data.logo} />
            <MediaContentHeader
              name={data.name}
              genre={data.genre || data.genres}
              released={data.released}
              runtime={data.runtime}
              imdbRating={data.imdbRating}
              releaseInfo={data.releaseInfo}
            />
            <SearchButton onPress={handlePlayPress} text="Movie" />
            <MediaContentDescription description={data.description} />
            <MediaCastAndCrews cast={cast}></MediaCastAndCrews>
          </View>
          <BottomSpacing space={20} />
        </View>
        <View>
          <View style={{ justifyContent: 'center', marginTop: isPortrait ? 5 : '10%' }}>
          </View>
        </View>
        <View style={styles.recommendationsContainer}>
          <PosterList apiUrl={`https://api.themoviedb.org/3/movie/${moviedbid}/recommendations`} title='More like this' type='movie' />
          <BottomSpacing space={50} />
        </View>
      </LinearGradient>
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
    color: '#ffffff',
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
  recommendationsContainer: {
  }
});

export default MovieDetails;
