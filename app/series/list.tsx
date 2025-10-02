import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { ActivityIndicator, StatusBar, Text, View } from '@/components/Themed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported } from '@/utils/platform';
import { getYear } from '@/utils/Date';
import BottomSpacing from '@/components/BottomSpacing';
import { SafeAreaView } from 'react-native-safe-area-context';

const EXPO_PUBLIC_TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

const SeriesList = () => {
  const router = useRouter();
  const { apiUrl } = useLocalSearchParams();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { width, height } = useWindowDimensions();
  const isPortrait = height >= width;
  const shortSide = Math.min(width, height);

  const isMobile = shortSide < 580;
  const isTablet = shortSide >= 580 && shortSide < 1024;
  const isLaptop = shortSide >= 1024 && shortSide < 1440;
  const isDesktop = shortSide >= 1440;

  const getNumColumns = () => {
    if (isMobile) return isPortrait ? 3 : 5;
    if (isTablet) return isPortrait ? 5 : 8;
    if (isLaptop) return isPortrait ? 6 : 9;
    if (isDesktop) return isPortrait ? 7 : 10;
    return 5;
  };

  const numColumns = getNumColumns();
  const spacing = 16;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const separator = apiUrl.includes('?') ? '&' : '?';
        const response = await fetch(`${apiUrl}${separator}api_key=${EXPO_PUBLIC_TMDB_API_KEY}`);
        const result = await response.json();
        if (result?.results) {
          const list = result.results
            .filter((item: any) => item.poster_path && item.backdrop_path)
            .map((item: any) => ({
              moviedbid: item.id,
              name: item.title || item.name,
              year: getYear(item.release_date || item.first_air_date),
              poster: `https://image.tmdb.org/t/p/w780${item.poster_path}`,
              background: `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`,
              imdbRating: item.vote_average?.toFixed(1),
              imdbid: item.imdb_id,
            }));
          setData(list);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiUrl]);

  const renderItem = ({ item }: { item: any }) => {
    const year = item.year?.split('–')[0] || item.year;

    const handlePress = async () => {
      if (isHapticsSupported()) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      router.push({
        pathname: '/series/details',
        params: { moviedbid: item.moviedbid || item.id },
      });
    };

    return (
      <Pressable
        style={[
          styles.posterContainer,
          {
            flexBasis: `${100 / numColumns}%`,
            paddingHorizontal: spacing / 2,
          },
        ]}
        onPress={handlePress}
      >
        <Image
          source={{ uri: item.poster }}
          style={[styles.posterImage, { aspectRatio: 2 / 3, width: '100%' }]}
          resizeMode="cover"
        />
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.posterTitle}>
          {item.name}
        </Text>
        <Text style={styles.posterYear}>{`★ ${item.imdbRating}   ${year}`}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View>
        <StatusBar />
        {loading ? (
          <View style={styles.centeredContainer}>
            <ActivityIndicator size="large" color="#535aff" />
            <Text style={styles.centeredText}>Loading</Text>
          </View>
        ) : (
          <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={(_, index) => index.toString()}
            numColumns={numColumns}
            columnWrapperStyle={{ justifyContent: 'flex-start' }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
      <BottomSpacing space={30} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 5,
    marginTop: 40
  },
  listContent: {
  },
  posterContainer: {
    marginVertical: 10,
  },
  posterImage: {
    borderRadius: 8,
    backgroundColor: '#101010',
  },
  posterTitle: {
    marginTop: 8,
    fontSize: 14,
  },
  posterYear: {
    marginTop: 4,
    fontSize: 12,
    color: '#ccc',
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

export default SeriesList;
