import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, TouchableOpacity, View as RNView } from 'react-native';
import { Text } from '@/components/Themed';
import { Link, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';  // Importing Haptics for haptic feedback

const SeriesList = () => {
  const { apiUrl } = useLocalSearchParams();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(apiUrl as string);
        const result = await response.json();
        if (result.metas) {
          setData(result.metas);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiUrl]);

  const handlePress = (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);  // Trigger haptic feedback on press
  };

  const renderItem = ({ item }: any) => {
    const year = item.year?.split('–')[0] || item.year;

    return (
      <Link
        href={{
          pathname: `/movie/details`,
          params: { imdbid: item.imdb_id || item.id },
        }}
      >
        <RNView>
          <TouchableOpacity
            style={styles.posterContainer}
            onPress={() => handlePress(item)}  // Handle press and trigger haptic feedback
          >
            <Image source={{ uri: item.poster }} style={styles.posterImage} />
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.posterTitle}>
              {item.name}
            </Text>
            <Text style={styles.posterYear}>{year}</Text>
          </TouchableOpacity>
        </RNView>
      </Link>
    );
  };

  return (
    <RNView style={styles.container}>
      {loading ? (
        <Text style={styles.title}>Loading...</Text>
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          numColumns={3}
          showsVerticalScrollIndicator={false}
        />
      )}
    </RNView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    padding: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  posterContainer: {
    padding: 10,
    marginBottom: 10,
  },
  posterImage: {
    width: 100,
    height: 150,
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
});

export default SeriesList;
