// HorizontalPosterList.tsx
import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, View } from './Themed';

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

  const renderItem = ({ item }: any) => {
    const year = item.year && typeof item.year === 'string' && item.year.includes('–')
      ? item.year.split('–')[0]
      : item.year;
    return (
      <View style={[styles.posterContainer, layout === 'vertical' && styles.verticalContainer]}>
        <Image
          source={{ uri: item.poster }}
          style={[styles.posterImage, layout === 'vertical' && styles.verticalImage]}
        />
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={styles.posterTitle}
        >
          {item.name}
        </Text>
        <Text style={styles.posterYear}>
          {year}
        </Text>
      </View>
    )
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text lightColor="rgba(0,0,0,0.8)" darkColor="rgba(255,255,255,0.8)" style={styles.title}>
          {title}
        </Text>
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
          horizontal={layout === 'horizontal'}
          showsHorizontalScrollIndicator={false}
          numColumns={layout === 'vertical' ? 2 : 1}
        />
      )}
    </View>
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
    fontWeight: 'bold'
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
});

export default PosterList;
