import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Pressable, View as RNView, Platform } from 'react-native';
import { ActivityIndicator, Text, View } from '@/components/Themed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const MoviesList = () => {
  const router = useRouter();
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

  const renderItem = ({ item }: any) => {
    const year = item.year?.split('–')[0] || item.year;

    const handlePress = async () => {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      } router.push({
        pathname: '/movie/details',
        params: { imdbid: item.imdb_id || item.id },
      })
    };

    return (
      <RNView>
        <Pressable
          style={styles.posterContainer}
          onPress={handlePress}
        >
          <Image source={{ uri: item.poster }} style={styles.posterImage} />
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.posterTitle}>
            {item.name}
          </Text>
          <Text style={styles.posterYear}>{year}</Text>
        </Pressable>
      </RNView>
    );
  };

  return (
    <RNView style={styles.container}>
      {loading ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" style={styles.activityIndicator} color="#535aff" />
          <Text style={styles.centeredText}>Loading</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.posterList}
        />
      )}
    </RNView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 20,
    padding: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  posterList: {
    paddingVertical: 20
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
    color: '#888',
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
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default MoviesList;
