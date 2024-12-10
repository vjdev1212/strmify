import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import PosterList from '@/components/PosterList';
import { CatalogUrl } from '@/constants/Stremio';

export default function HomeScreen() {

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <PosterList apiUrl={CatalogUrl.topMovies} title='Movies - Top' type='movie' />
        <PosterList apiUrl={CatalogUrl.topSeries} title='Series - Top' type='series' />
        <PosterList apiUrl={CatalogUrl.popularMovies} title='Movies - Popular' type='movie' />
        <PosterList apiUrl={CatalogUrl.popularSeries} title='Series - Popular' type='series' />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  }
});
