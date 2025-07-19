import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StatusBar, Text, View } from '../../components/Themed';
import MediaContentDescription from '@/components/MediaContentDescription';
import MediaContentHeader from '@/components/MediaContentHeader';
import MediaContentPoster from '@/components/MediaContentPoster';
import SeasonEpisodeList from '@/components/SeasonEpisodeList';
import BottomSpacing from '@/components/BottomSpacing';
import MediaLogo from '@/components/MediaLogo';
import MediaCastAndCrews from '@/components/MediaCastAndCrews';
import PosterList from '@/components/PosterList';
import MediaContentDetailsList from '@/components/MediaContentDetailsList';
import { useColorScheme } from '@/components/useColorScheme';
import { isHapticsSupported } from '@/utils/platform';
import * as Haptics from 'expo-haptics';
import PlayButton from '@/components/PlayButton';


const EXPO_PUBLIC_TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

const SeriesDetails = () => {
  const { moviedbid } = useLocalSearchParams();
  const [data, setData] = useState<any>(null);
  const [imdbid, setImdbId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [cast, setCast] = useState<any[]>([]);
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
          `https://api.themoviedb.org/3/tv/${moviedbid}?api_key=${EXPO_PUBLIC_TMDB_API_KEY}`
        );
        const result = await response.json();
        if (result) {
          const externalIds = await getExternalIds();
          const castAndCrews = await getCastandCrew();
          setCast(castAndCrews);
          const logo = `https://images.metahub.space/logo/medium/${externalIds.imdb_id}/img`;
          setImdbId(externalIds.imdb_id);

          const seasonPromises = result.seasons.map(async (season: any) => {
            const episodes = await getEpisodes(season.season_number);
            return episodes.episodes.map((episode: any) => ({
              season: season.season_number,
              episode: episode.episode_number,
              number: episode.episode_number,
              thumbnail: `https://image.tmdb.org/t/p/original/${episode.still_path}`,
              name: episode.name,
              firstAired: episode.air_date,
              overview: episode.overview,
            }));
          });

          const videosArray = (await Promise.all(seasonPromises)).flat();

          const seriesData = {
            name: result.name,
            background: `https://image.tmdb.org/t/p/original${result.backdrop_path}`,
            poster: `https://image.tmdb.org/t/p/w780${result.poster_path}`,
            logo: logo,
            genre: result.genres.map((genre: any) => genre.name),
            released: result.first_air_date,
            country: result.origin_country,
            languages: result.spoken_languages,
            status: result.status,
            runtime: result.episode_run_time?.[0] || null,
            imdbRating: result.vote_average?.toFixed(1),
            releaseInfo: result.first_air_date,
            description: result.overview,
            videos: videosArray,
          };
          setData(seriesData);
        }
      } catch (error) {
        console.error('Error fetching series details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [moviedbid]);

  const getExternalIds = async () => {
    const externalIdsResponse = await fetch(
      `https://api.themoviedb.org/3/tv/${moviedbid}/external_ids?api_key=${EXPO_PUBLIC_TMDB_API_KEY}`
    );
    const externalIdsResult = await externalIdsResponse.json();
    return externalIdsResult;
  }

  const getEpisodes = async (season: string) => {
    const episodesResponse = await fetch(
      `https://api.themoviedb.org/3/tv/${moviedbid}/season/${season}?api_key=${EXPO_PUBLIC_TMDB_API_KEY}`
    );
    const episodesResult = await episodesResponse.json();
    return episodesResult;
  }

  const getCastandCrew = async () => {
    const castAndCrewsResponse = await fetch(
      `https://api.themoviedb.org/3/tv/${moviedbid}/credits?api_key=${EXPO_PUBLIC_TMDB_API_KEY}`
    );
    const castAndCrewResult = await castAndCrewsResponse.json();
    return castAndCrewResult.cast || [];
  }

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" style={styles.activityIndicator} color="#ffffff" />
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
      params: { imdbid: imdbid, tmdbid: moviedbid, type: 'series', name: data.name, season: season, episode: episode },
    });
  };

  const handlePlayPress = async () => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    router.push({
      pathname: '/stream/list',
      params: { imdbid: imdbid, tmdbid: moviedbid, type: 'series', name: data.name, season: 1, episode: 1 },
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
          padding: isPortrait ? null : '2%'
        }]}>
          <MediaContentPoster background={data.background} isPortrait={isPortrait} />
        </View>
        <View style={[styles.detailsContainer, {
          width: isPortrait ? '100%' : '50%',
          paddingHorizontal: isPortrait ? null : 5,
          zIndex: 10
        }]}>
          <MediaLogo logo={data.logo} title={data.name} />
          <MediaContentHeader
            name={data.name}
            genre={data.genre}
            released={data.released}
            runtime={data.runtime}
            imdbRating={data.imdbRating}
            releaseInfo={data.releaseInfo}
          />
          <PlayButton onPress={handlePlayPress} />
          <MediaContentDescription description={data.description} />
          {
            isPortrait && (
              <MediaContentDetailsList type='tv' released={data.released} country={data.country} languages={data.languages} genre={data.genre || data.genres} runtime={data.runtime} imdbRating={data.imdbRating} />
            )
          }
          {
            isPortrait ? (null) : (
              <>
                <BottomSpacing space={80} />
              </>
            )
          }
        </View>
      </View>
      {
        isPortrait && (<Divider />)
      }
      <View style={styles.castContainer}>
        <MediaCastAndCrews cast={cast}></MediaCastAndCrews>
      </View>
      <View>
        <View style={{ justifyContent: 'center', marginTop: 5 }}>
          <SeasonEpisodeList videos={data.videos} onEpisodeSelect={handleEpisodeSelect} />
        </View>
      </View>
      <View style={styles.recommendationsContainer}>
        <PosterList apiUrl={`https://api.themoviedb.org/3/tv/${moviedbid}/recommendations`} title='More like this' type='series' />
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

export default SeriesDetails;
