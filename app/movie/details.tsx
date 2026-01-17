import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StatusBar, Text, View } from '../../components/Themed';
import MediaContentDescription from '@/components/MediaContentDescription';
import MediaContentHeader from '@/components/MediaContentHeader';
import MediaContentPoster from '@/components/MediaContentPoster';
import BottomSpacing from '@/components/BottomSpacing';
import MediaLogo from '@/components/MediaLogo';
import MediaCastAndCrews from '@/components/MediaCastAndCrews';
import PosterList from '@/components/PosterList';
import PlayButton from '@/components/PlayButton';
import MediaContentDetailsList from '@/components/MediaContentDetailsList';
import WatchTrailerButton from '@/components/WatchTrailer';
import LibraryButton from '@/components/LibraryButton';
import * as Haptics from 'expo-haptics';

const EXPO_PUBLIC_TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

const MovieDetails = () => {
  const { moviedbid } = useLocalSearchParams();
  const [data, setData] = useState<any>(null);
  const [imdbid, setImdbId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [cast, setCast] = useState<any[]>([]);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
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
          const trailer = await getTrailer();
          setCast(castAndCrews);
          setImdbId(externalIds.imdb_id);
          setTrailerKey(trailer);
          const logo = `https://images.metahub.space/logo/medium/${externalIds.imdb_id}/img`;
          const movie = result;
          const movieData = {
            name: movie.title,
            background: `https://image.tmdb.org/t/p/${isPortrait ? 'w1280' : 'original'}${movie.backdrop_path}`,
            poster: `https://image.tmdb.org/t/p/w780${movie.poster_path}`,
            logo: logo,
            genre: movie.genres.map((genre: any) => genre.name),
            released: movie.release_date,
            year: movie.release_date?.split('-')[0],
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

  const getTrailer = async () => {
    try {
      const videosResponse = await fetch(
        `https://api.themoviedb.org/3/movie/${moviedbid}/videos?api_key=${EXPO_PUBLIC_TMDB_API_KEY}`
      );
      const videosResult = await videosResponse.json();

      if (!videosResult.results || videosResult.results.length === 0) {
        return null;
      }

      // Filter official trailers/teasers from YouTube
      const officialTrailers = videosResult.results.filter(
        (video: any) =>
          video.site === 'YouTube' && (video.type === 'Trailer') && video.official === true
      );

      if (officialTrailers.length > 0) {
        const latestTrailer = officialTrailers[0];
        return latestTrailer.key;
      }

      const fallbackTeasers = videosResult.results.filter(
        (video: any) => video.site === 'YouTube' && (video.type === 'Teaser') && video.official === true
      );

      if (fallbackTeasers.length > 0) {
        const latestFallback = fallbackTeasers[0];
        return latestFallback.key;
      }

      return null;
    } catch (error) {
      console.error('Error fetching trailer:', error);
      return null;
    }
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
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/stream/list',
      params: {
        imdbid: imdbid,
        type: 'movie',
        name: data.name,
        title: data.year != null ? `${data.name} (${data.year})` : data.name,
        season: 0,
        episode: 0
      },
    });
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
          <View style={styles.buttonsContainer}>
            <LibraryButton
              item={{
                id: `movie-${moviedbid}`,
                moviedbid: moviedbid as string,
                type: 'movie',
                title: data.name,
                poster: data.poster,
                backdrop: data.background,
                year: data.year,
                rating: data.imdbRating,
                genres: data.genre,
                watched: false
              }}
            />
            <PlayButton onPress={handlePlayPress} />
            <WatchTrailerButton trailerKey={trailerKey} />
          </View>
          <MediaContentDescription description={data.description} />
        </View>
      </View>
      <View style={styles.castContainer}>
        <MediaCastAndCrews cast={cast}></MediaCastAndCrews>
      </View>
      {
        isPortrait && (
          <MediaContentDetailsList type='movie' released={data.released} country={data.country} languages={data.languages} genre={data.genre || data.genres} runtime={data.runtime} imdbRating={data.imdbRating} />
        )
      }
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
  buttonsContainer: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
    alignItems: 'center'
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