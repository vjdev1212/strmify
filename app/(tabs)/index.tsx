import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import PosterList from '@/components/PosterList';
import { CatalogUrl } from '@/constants/Stremio';
import { StatusBar, View } from '@/components/Themed';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#111111', '#222222']} start={[0, 0]} end={[1, 1]}>
        <SafeAreaView style={styles.container}>
          <StatusBar />
          <View style={styles.contentContainer}>
            <PosterList apiUrl={CatalogUrl.popularMovies} title='Movies - Popular' type='movie' />
            <PosterList apiUrl={CatalogUrl.popularSeries} title='Series - Popular' type='series' />
            <PosterList apiUrl={CatalogUrl.topMovies} title='Movies - Top Rated' type='movie' />
            <PosterList apiUrl={CatalogUrl.topSeries} title='Series - Top Rated' type='series' />
            <PosterList apiUrl={CatalogUrl.nowPlayingMovies} title='Movies - Now Playing' type='movie' />
            <PosterList apiUrl={CatalogUrl.onTheAirTv} title='Series - On the Air' type='series' />
            <PosterList apiUrl={CatalogUrl.upcomingMovies} title='Movies - Upcoming' type='movie' />
            <PosterList apiUrl={CatalogUrl.airingTodayTv} title='Series - Airing Today' type='series' />
          </View>
        </SafeAreaView>
      </LinearGradient>
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
  }
});
