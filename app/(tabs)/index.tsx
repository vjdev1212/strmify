import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import PosterList from '@/components/PosterList';

export default function HomeScreen() {
  const catalogUrl = {
    topMovies: 'https://v3-cinemeta.strem.io/catalog/movie/top.json',
    topSeries: 'https://v3-cinemeta.strem.io/catalog/series/top.json',
    popularMovies: 'https://v3-cinemeta.strem.io/catalog/series/imdbRating.json',
    popularSeries: 'https://v3-cinemeta.strem.io/catalog/movie/imdbRating.json'
  }
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <PosterList apiUrl={catalogUrl.topMovies} title='Top Movies' type='movie' />
        <PosterList apiUrl={catalogUrl.topSeries} title='Top Series' type='series' />
        <PosterList apiUrl={catalogUrl.popularMovies} title='Popular Movies' type='movie' />
        <PosterList apiUrl={catalogUrl.popularSeries} title='Popular Series' type='series' />
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
