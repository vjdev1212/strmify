import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, TouchableOpacity, View as RNView } from 'react-native';
import { Text, View } from './Themed';
import { Link, router } from 'expo-router';
import * as Haptics from 'expo-haptics'; // Importing Haptics for haptic feedback

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
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch data when apiUrl changes
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
  }, [apiUrl]); // Dependency array contains only apiUrl

  const handlePress = async (item: any) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: `/${type}/details`,
      params: { imdbid: item.imdb_id || item.id },
    })
  };

  const renderItem = ({ item }: any) => {
    const year =
      item.year && typeof item.year === 'string' && item.year.includes('–')
        ? item.year.split('–')[0]
        : item.year;

    return (
      <RNView>
        <TouchableOpacity
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
        </TouchableOpacity>
      </RNView>
    );
  };

  const handleSeeAllPress = async (item: any) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: `/${type}/list`,
      params: { apiUrl, title, type },
    })
  }

  return (
    <RNView style={styles.container}>
      <RNView style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={handleSeeAllPress}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
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
    backgroundColor: 'white', 
    elevation: 5, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.3,
    shadowRadius: 4, 
  },
  verticalImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: 'white',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
  },
});

export default PosterList;
