// HorizontalPosterList.tsx
import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, View } from './Themed';


// Reusable Horizontal Poster List Component
const HorizontalPosterList = ({ apiUrl, title, type }: { apiUrl: string, title: string, type: 'movie' | 'series' }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(apiUrl);
        const result = await response.json();
        setData(result.metas.slice(0, 10));  // Fetch only the first 10 items
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiUrl]);

  // Render each poster item
  const renderItem = ({ item }: any) => (
    <View style={styles.posterContainer}>
      <Image
        source={{ uri: item.poster }}  // Use 'poster' for movies and 'imageUrl' for series
        style={styles.posterImage}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text lightColor="rgba(0,0,0,0.8)"
          darkColor="rgba(255,255,255,0.8)" style={styles.title}>{title}</Text>
        <TouchableOpacity>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    paddingHorizontal: 15,  // Added horizontal padding for the container
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
  },
  posterContainer: {
    marginRight: 10,
  },
  posterImage: {
    width: 120,
    height: 180,
    borderRadius: 8,
  },
});

export default HorizontalPosterList;
