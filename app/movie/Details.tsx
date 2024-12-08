import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, Image, View as RNView, TouchableOpacity } from 'react-native';
import { Text, View } from '../../components/Themed';
import { useLocalSearchParams } from 'expo-router';


const MovieDetails = () => {
  const { imdbid } = useLocalSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await fetch(
          `https://v3-cinemeta.strem.io/meta/movie/${imdbid}.json`
        );
        const result = await response.json();
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options); // You can adjust 'en-US' to other locales if needed
  };

  const { background, name, description, genre, runtime, released, imdbRating, country, director, writer, cast } = data;

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: background }} style={styles.poster} />
      <View style={styles.contentContainer}>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.genre}>{genre?.join(', ')}</Text>
        <Text style={styles.info}>
          ★ {imdbRating} | Runtime: {runtime}
        </Text>
        <View style={styles.playButtonWrapper}>
          <TouchableOpacity style={styles.playButton} onPress={() => console.log('Play clicked')}>
            <Text style={styles.playButtonText}>Play Movie</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.detailsContainer}>
          {released && (
            <>
              <Text style={styles.label}>Released: </Text>
              <Text style={styles.value}>{formatDate(released)}</Text>
            </>
          )}

          {country && (
            <>
              <Text style={styles.label}>Country: </Text>
              <Text style={styles.value}>{country}</Text>
            </>
          )}

          {director?.length > 0 && (
            <>
              <Text style={styles.label}>Directors:</Text>
              <Text style={styles.value}>{director?.join(', ')}</Text>
            </>
          )}

          {writer?.length > 0 && (
            <>
              <Text style={styles.label}>Writers:</Text>
              <Text style={styles.value}>{writer?.join(', ')}</Text>
            </>
          )}

          {cast?.length > 0 && (
            <>
              <Text style={styles.label}>Cast:</Text>
              <Text style={styles.value}>{cast?.join(', ')}</Text>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    marginBottom: 50
  },
  poster: {
    width: '100%',
    height: 300,
    resizeMode: 'cover', // Ensures the image covers the area
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  genre: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 10,
    textAlign: 'center'
  },
  info: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center'
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
  },
  playButtonWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  playButton: {
    backgroundColor: '#fc7703', // Blue background for the button
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginVertical: 20,
    width: 300,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailsContainer: {
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  value: {
    fontSize: 14,
    marginBottom: 15,
  },
});

export default MovieDetails;
