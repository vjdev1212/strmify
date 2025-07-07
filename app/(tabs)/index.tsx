import { SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useMemo, useState } from 'react';
import PosterList from '@/components/PosterList';
import { CatalogUrl } from '@/constants/Stremio';
import { StatusBar, View } from '@/components/Themed';
import * as Haptics from 'expo-haptics';
import { getOriginalPlatform, isHapticsSupported, showAlert } from '@/utils/platform';


export default function HomeScreen() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'movies', label: 'Movies' },
    { id: 'tv', label: 'TV Shows' }
  ];

  const allPosterLists = [
    { apiUrl: CatalogUrl.popularMovies, title: 'Movies - Popular', type: 'movie' as const },
    { apiUrl: CatalogUrl.popularSeries, title: 'Series - Popular', type: 'series' as const },
    { apiUrl: CatalogUrl.topMovies, title: 'Movies - Top Rated', type: 'movie' as const },
    { apiUrl: CatalogUrl.topSeries, title: 'Series - Top Rated', type: 'series' as const },
    { apiUrl: CatalogUrl.nowPlayingMovies, title: 'Movies - Now Playing', type: 'movie' as const },
    { apiUrl: CatalogUrl.onTheAirTv, title: 'Series - On the Air', type: 'series' as const },
    { apiUrl: CatalogUrl.upcomingMovies, title: 'Movies - Upcoming', type: 'movie' as const },
    { apiUrl: CatalogUrl.airingTodayTv, title: 'Series - Airing Today', type: 'series' as const }
  ];

  const filteredPosterLists = useMemo(() => {
    if (selectedCategory === 'all') {
      return allPosterLists;
    } else if (selectedCategory === 'movies') {
      return allPosterLists.filter(item => item.type === 'movie');
    } else if (selectedCategory === 'tv') {
      return allPosterLists.filter(item => item.type === 'series');
    }
    return allPosterLists;
  }, [selectedCategory]);

  const setCategory = async (id: any) => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    setSelectedCategory(id)
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SafeAreaView style={styles.container}>
        <StatusBar />
        <View style={styles.contentContainer}>
          {/* Category Filter Buttons */}
          <View style={styles.categoryContainer}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && styles.categoryButtonActive
                ]}
                onPress={() => setCategory(category.id)}
              >
                <Text style={[
                  styles.categoryButtonText,
                  selectedCategory === category.id && styles.categoryButtonTextActive
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Filtered Poster Lists */}
          {filteredPosterLists.map((item, index) => (
            <PosterList
              key={`${item.type}-${index}`}
              apiUrl={item.apiUrl}
              title={item.title}
              type={item.type}
            />
          ))}
        </View>
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
  },
  contentContainer: {
    marginTop: 30
  },
  categoryContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginHorizontal: 8,
    backgroundColor: '#1f1f1f',
  },
  categoryButtonActive: {
    backgroundColor: '#535aff',
  },
  categoryButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
});