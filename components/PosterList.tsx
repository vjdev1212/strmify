import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, TouchableOpacity, View as RNView } from 'react-native';
import { Text } from './Themed';
import { Href, Link, useRouter } from 'expo-router';

// Skeleton Loader Component
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
  const router = useRouter();
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

  const renderItem = ({ item }: any) => {
    const year =
      item.year && typeof item.year === 'string' && item.year.includes('–')
        ? item.year.split('–')[0]
        : item.year;

    const handlePress = () => {
      const href: Href = {
        pathname: item.type === 'movie' ? '/movie/MovieDetails' : '/series/SeriesDetails',
        params: { imdbid: item.imdb_id },
      };

      router.push(href);
    };

    return (
      <TouchableOpacity
        style={[styles.posterContainer, layout === 'vertical' && styles.verticalContainer]}
        onPress={handlePress} >
        <Image
          source={{ uri: item.poster }}
          style={[styles.posterImage, layout === 'vertical' && styles.verticalImage]}
        />
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.posterTitle}>
          {item.name}
        </Text>
        <Text style={styles.posterYear}>{year}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <RNView style={styles.container}>
      <RNView style={styles.header}>
        <Text lightColor="rgba(0,0,0,0.8)" darkColor="rgba(255,255,255,0.8)" style={styles.title}>
          {title}
        </Text>
        <TouchableOpacity>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </RNView>

      {loading ? (
        <FlatList
          data={new Array(10).fill(null)} // Dummy array for skeleton loader
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
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAllText: {
    fontSize: 14,
    color: '#007BFF',
    fontWeight: 'bold',
  },
  posterContainer: {
    marginRight: 15,
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
    color: 'gray',
  },
  // Skeleton styles
  skeletonContainer: {
    marginRight: 15,
    width: 100,
    alignItems: 'center',
  },
  skeletonImage: {
    width: 100,
    height: 150,
    backgroundColor: 'gray',
    borderRadius: 8,
  }
});

export default PosterList;
