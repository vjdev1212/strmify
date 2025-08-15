import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StatusBar, Text, View } from '../../components/Themed';
import MediaContentDescription from '@/components/MediaContentDescription';
import MediaContentHeader from '@/components/MediaContentHeader';
import MediaContentPoster from '@/components/MediaContentPoster';
import * as Haptics from 'expo-haptics';
import BottomSpacing from '@/components/BottomSpacing';
import { isHapticsSupported } from '@/utils/platform';
import MediaLogo from '@/components/MediaLogo';
import MediaCastAndCrews from '@/components/MediaCastAndCrews';
import PosterList from '@/components/PosterList';
import PlayButton from '@/components/PlayButton';
import MediaContentDetailsList from '@/components/MediaContentDetailsList';

const EXPO_PUBLIC_TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

const MovieDetails = () => {
  const { moviedbid } = useLocalSearchParams();
  const [data, setData] = useState<any>(null);
  const [imdbid, setImdbId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [cast, setCast] = useState<any[]>([]);
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;
  const ref = useRef<ScrollView | null>(null);

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
            background: `https://image.tmdb.org/t/p/original${movie.backdrop_path}`,
            poster: `https://image.tmdb.org/t/p/w780${movie.poster_path}`,
            logo: logo,
            genre: movie.genres.map((genre: any) => genre.name),
            released: movie.release_date,
            country: movie.origin_country,
            languages: movie.spoken_languages,
            status: movie.status,
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

  const Divider = () => {
    const dividerColor = {
      color: '#ffffff',
    };
    return (
      <View>
        <Text style={[styles.divider, dividerColor]}>...</Text>
      </View>
    )
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container} ref={ref}>
      <StatusBar />
      <View style={[styles.rootContainer, {
        flexDirection: isPortrait ? 'column' : 'row-reverse',
        marginTop: isPortrait ? 0 : '5%',
        justifyContent: 'center',
      }]}>
        <View style={[styles.posterContainer, {
          width: isPortrait ? '100%' : '50%',
          padding: isPortrait ? null : '2%',
          alignItems: isPortrait ? 'center' : 'flex-end',
        }]}>
          <MediaContentPoster background={data.background} isPortrait={isPortrait} />
        </View>

        <View style={[styles.detailsContainer, {
          width: isPortrait ? '100%' : '50%',
          paddingHorizontal: isPortrait ? null : 5,
          zIndex: 10
        }]}>
          <MediaLogo logo={data.logo} title={data.name} />
          {!isPortrait && (
            <MediaContentHeader
              name={data.name}
              genre={data.genre || data.genres}
              released={data.released}
              runtime={data.runtime}
              imdbRating={data.imdbRating}
              releaseInfo={data.releaseInfo}
            />)}
          <PlayButton onPress={handlePlayPress} />
          <MediaContentDescription description={data.description} />
          {
            isPortrait && (
              <MediaContentDetailsList type='movie' released={data.released} country={data.country} languages={data.languages} genre={data.genre || data.genres} runtime={data.runtime} imdbRating={data.imdbRating} />
            )
          }
        </View>
      </View>
      <View style={styles.castContainer}>
        <MediaCastAndCrews cast={cast}></MediaCastAndCrews>
      </View>
      <View style={styles.recommendationsContainer}>
        <PosterList apiUrl={`https://api.themoviedb.org/3/movie/${moviedbid}/recommendations`} title='Recommended' type='movie' />
      </View>
      <View style={styles.recommendationsContainer}>
        <PosterList apiUrl={`https://api.themoviedb.org/3/movie/${moviedbid}/similar`} title='Similar to this' type='movie' />
      </View>
      <BottomSpacing space={50} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  rootContainer: {
    flex: 1,
    flexDirection: 'column',
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
  castContainer: {
    marginHorizontal: '1%'
  },
  recommendationsContainer: {
  },
  divider: {
    textAlign: 'center',
    fontSize: 20,
    paddingBottom: 10
  }
});

export default MovieDetails;
