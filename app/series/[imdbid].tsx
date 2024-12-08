import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, Image } from 'react-native';
import { Text } from '../../components/Themed';

const SeriesDetails = ({ imdbid }: { imdbid: string }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await fetch(
          `https://v3-cinemeta.strem.io/meta/series/${imdbid}.json`
        );
        const result = await response.json();
        console.log(result);
        setData(result.meta);
      } catch (error) {
        console.error('Error fetching movie details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [imdbid]);

  if (loading) {
    return <Text>Loading...</Text>;
  }

  if (!data) {
    return <Text>No movie details available</Text>;
  }

  const { poster, name, description, genre, runtime, released, imdbRating } = data;

  return (
    <>
      <Image source={{ uri: poster }} style={styles.poster} />
      <ScrollView style={styles.container}>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.genre}>{genre.join(', ')}</Text>
        <Text style={styles.info}>
          Released: {released} | Runtime: {runtime} | IMDb: {imdbRating}
        </Text>
        <Text style={styles.description}>{description}</Text>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10
  },
  poster: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  genre: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 10,
  },
  info: {
    fontSize: 14,
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
  },
});

export default SeriesDetails;
