import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import PosterList from '@/components/PosterList';
import { CatalogUrl } from '@/constants/Stremio';
import { View } from '@/components/Themed';

export default function HomeScreen() {

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <PosterList apiUrl={CatalogUrl.topMovies} title='Movies - Top' type='movie' />
          <PosterList apiUrl={CatalogUrl.topSeries} title='Series - Top' type='series' />
          <PosterList apiUrl={CatalogUrl.popularMovies} title='Movies - Popular' type='movie' />
          <PosterList apiUrl={CatalogUrl.popularSeries} title='Series - Popular' type='series' />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
  },
  contentContainer: {
    marginTop: 30
  }
});
