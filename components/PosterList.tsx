import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Pressable, View as RNView, Platform, ScrollView } from 'react-native';
import { Text } from './Themed';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const SkeletonLoader = () => (
  <RNView style={styles.skeletonContainer}>
    <RNView style={styles.skeletonImage} />
  </RNView>
);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(apiUrl);
        const result = await response.json();
        setData(result.metas.slice(0, 20));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiUrl]);

  const handlePress = async (item: any) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    router.push({
      pathname: `/${type}/details`,
      params: { imdbid: item.imdb_id || item.id },
    });
  };

  const handleSeeAllPress = async () => {
    if (Platform.OS !== 'web') {
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
        <ScrollView
          horizontal={layout === 'horizontal'}
          showsHorizontalScrollIndicator={false}
        >
          {new Array(10).fill(null).map((_, index) => (
            <SkeletonLoader key={index} />
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          horizontal={layout === 'horizontal'}
          showsHorizontalScrollIndicator={false}
        >
          {data.map((item, index) => {
            const year =
              item.year && typeof item.year === 'string' && item.year.includes('–')
                ? item.year.split('–')[0]
                : item.year;

            return (
              <Pressable
                key={index}
                style={[styles.posterContainer, layout === 'vertical' && styles.verticalContainer]}
                onPress={() => handlePress(item)}
              >
                <Image
                  source={{ uri: item.poster }}
                  style={[styles.posterImage, layout === 'vertical' && styles.verticalImage]}
                />
                <Text numberOfLines={1} ellipsizeMode="tail" style={styles.posterTitle}>
                  {item.name}
                </Text>
                <Text style={styles.posterYear}>{year}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
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
