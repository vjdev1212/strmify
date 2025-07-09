import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import PosterList from '@/components/PosterList';
import { StatusBar, View } from '@/components/Themed';
import { CatalogUrl, MovieGneres } from '@/constants/Stremio';

export default function MoviesScreen() {

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <PosterList apiUrl={CatalogUrl.trendingMovies} title='Trending' type='movie' />
          <PosterList apiUrl={CatalogUrl.nowPlayingMovies} title='Now Playing' type='movie' />
          <PosterList apiUrl={MovieGneres.action} title="Action" type="movie" />
          <PosterList apiUrl={MovieGneres.adventure} title="Adventure" type="movie" />
          <PosterList apiUrl={MovieGneres.scifi} title="Sci-Fi" type="movie" />
          <PosterList apiUrl={MovieGneres.comedy} title="Comedy" type="movie" />
          <PosterList apiUrl={MovieGneres.family} title="Family" type="movie" />
          <PosterList apiUrl={MovieGneres.animation} title="Animation" type="movie" />
          <PosterList apiUrl={MovieGneres.thriller} title="Thriller" type="movie" />
          <PosterList apiUrl={MovieGneres.crime} title="Crime" type="movie" />
          <PosterList apiUrl={MovieGneres.horror} title="Horror" type="movie" />
          <PosterList apiUrl={MovieGneres.mystery} title="Mystery" type="movie" />
          <PosterList apiUrl={MovieGneres.fantasy} title="Fantasy" type="movie" />
          <PosterList apiUrl={MovieGneres.drama} title="Drama" type="movie" />
          <PosterList apiUrl={MovieGneres.romance} title="Romance" type="movie" />
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
