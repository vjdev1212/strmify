import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import PosterList from '@/components/PosterList';
import { StatusBar, View } from '@/components/Themed';
import { CatalogUrl, TvGneres } from '@/constants/Stremio';

export default function SeriesScreen() {

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <PosterList apiUrl={CatalogUrl.trendingSeries} title='Trending' type='series' />
          <PosterList apiUrl={TvGneres.actionAdventure} title="Action & Adventure" type="series" />
          <PosterList apiUrl={TvGneres.drama} title="Drama" type="series" />
          <PosterList apiUrl={TvGneres.crime} title="Crime" type="series" />
          <PosterList apiUrl={TvGneres.comedy} title="Comedy" type="series" />  
          <PosterList apiUrl={TvGneres.mystery} title="Mystery" type="series" />
          <PosterList apiUrl={TvGneres.scifiFantsy} title="Sci-Fi & Fantasy" type="series" />
          <PosterList apiUrl={TvGneres.animation} title="Animation" type="series" />
          <PosterList apiUrl={TvGneres.family} title="Family" type="series" />
          <PosterList apiUrl={TvGneres.kids} title="Kids" type="series" />
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
