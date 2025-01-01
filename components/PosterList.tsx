import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Pressable, View as RNView, Animated, useColorScheme, Platform } from 'react-native';
import { Text } from './Themed';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics'; // Importing Haptics for haptic feedback
import { isHapticsSupported } from '@/utils/platform';

const SkeletonLoader = () => {
  const isWeb = Platform.OS === 'web';
  const colorScheme = isWeb ? 'dark' : useColorScheme();
  return (
    <RNView style={styles.skeletonContainer}>
      <RNView style={[styles.skeletonImage, { backgroundColor: colorScheme === 'dark' ? '#0f0f0f' : '#f0f0f0' }]} />
    </RNView>
  )
};

const PosterList = ({
  apiUrl,
  title,
  type,
  layout = 'horizontal',
}: {
  apiUrl: string;
  title: string;
  type: 'movie' | 'series';
  layout?: 'horizontal' | 'vertical';
}) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const isWeb = Platform.OS === 'web';
  const colorScheme = isWeb ? 'dark' : useColorScheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(apiUrl);
        const result = await response.json();
        setData(result.metas.slice(0, 20)); // Slice the first 20 items
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiUrl]);

  const handlePress = async (item: any) => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    router.push({
      pathname: type === 'movie' ? '/movie/details' : '/series/details',
      params: { imdbid: item.imdb_id || item.id },
    });
  };

  const renderItem = ({ item }: any) => {
    const year =
      item.year && typeof item.year === 'string' && item.year.includes('–')
        ? item.year.split('–')[0]
        : item.year;

    // Trigger the fade-in animation when image is loaded
    const handleImageLoad = () => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    };

    return (
      <RNView>
        <Pressable
          style={[styles.posterContainer, layout === 'vertical' && styles.verticalContainer]}
          onPress={() => handlePress(item)}
        >
          <Animated.Image
            source={{ uri: item.poster }}
            style={[
              styles.posterImage,
              layout === 'vertical' && styles.verticalImage,
              { opacity: fadeAnim, backgroundColor: colorScheme === 'dark' ? '#0f0f0f' : '#f0f0f0' },
            ]}
            onLoad={handleImageLoad}
          />
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.posterTitle}>
            {item.name}
          </Text>
          <Text style={styles.posterYear}>{year}</Text>
        </Pressable>
      </RNView>
    );
  };

  const handleSeeAllPress = async () => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    router.push({
      pathname: `/${type}/list`,
      params: { apiUrl, title, type },
    });
  };

  return (
    <RNView style={styles.container}>
      <RNView style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={handleSeeAllPress}>
          <Text style={styles.seeAllText}>See All</Text>
        </Pressable>
      </RNView>

      {loading ? (
        <FlatList
          data={new Array(10).fill(null)} // Skeleton loader
          renderItem={() => <SkeletonLoader />}
          keyExtractor={(item, index) => index.toString()}
          horizontal={layout === 'horizontal'}
          showsHorizontalScrollIndicator={false}
          numColumns={layout === 'vertical' ? 2 : 1}
        />
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          horizontal={layout === 'horizontal'}
          showsHorizontalScrollIndicator={false}
          numColumns={layout === 'vertical' ? 2 : 1}
        />
      )}
    </RNView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  posterContainer: {
    padding: 10,
  },
  verticalContainer: {
    marginBottom: 10,
  },
  posterImage: {
    width: 100,
    height: 150,
    borderRadius: 8,
  },
  verticalImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  posterTitle: {
    marginTop: 8,
    fontSize: 14,
    maxWidth: 100,
  },
  posterYear: {
    marginTop: 4,
    fontSize: 12,
    color: '#888',
  },
  skeletonContainer: {
    marginRight: 15,
    width: 100,
    alignItems: 'center',
  },
  skeletonImage: {
    width: 100,
    height: 150,
    backgroundColor: '#888888',
    borderRadius: 8,
  },
});

export default PosterList;
