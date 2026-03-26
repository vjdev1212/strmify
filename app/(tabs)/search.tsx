import { Text, ActivityIndicator, TextInput, View, StatusBar } from '@/components/Themed';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported } from '@/utils/platform';
import BottomSpacing from '@/components/BottomSpacing';
import PosterList from '@/components/PosterList';
import { SafeAreaView } from 'react-native-safe-area-context';
import BlurGradientBackground from '@/components/BlurGradientBackground';
import { useTheme } from '@/context/ThemeContext';

const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

const SearchScreen = () => {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const debounceTimeoutRef = useRef<any | null>(null);
  const [moviesUrl, setMoviesUrl] = useState<string | null>(null);
  const [seriesUrl, setSeriesUrl] = useState<string | null>(null);

  const urls = useMemo(() => {
    if (!query.trim()) return { movies: null, series: null };
    const encoded = encodeURIComponent(query);
    return {
      movies: `https://api.themoviedb.org/3/search/movie?query=${encoded}&api_key=${TMDB_API_KEY}`,
      series: `https://api.themoviedb.org/3/search/tv?query=${encoded}&api_key=${TMDB_API_KEY}`
    };
  }, [query]);

  useEffect(() => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    if (!query.trim()) { setMoviesUrl(null); setSeriesUrl(null); return; }
    debounceTimeoutRef.current = setTimeout(() => {
      setMoviesUrl(urls.movies);
      setSeriesUrl(urls.series);
    }, 300);
    return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
  }, [query, urls]);

  const clearSearch = useCallback(async () => {
    if (await isHapticsSupported()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuery('');
  }, []);

  const emptyStateContent = useMemo(() => {
    const hasQuery = query.length > 0;
    return {
      title: hasQuery ? 'No results found' : 'Start your search',
      subtitle: hasQuery ? 'Try searching with different keywords' : 'What would you like to watch today?'
    };
  }, [query.length]);

  const handleTextChange = useCallback((text: string) => setQuery(text), []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar />
      <BlurGradientBackground />
      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Search</Text>
      </View>

      <View style={styles.searchSection}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder }]}>
          <View style={styles.searchIconContainer}>
            <Ionicons name="search-outline" size={20} color={colors.textDim} />
          </View>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search movies or series..."
            placeholderTextColor={colors.textDim}
            value={query}
            onChangeText={handleTextChange}
            submitBehavior="blurAndSubmit"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={clearSearch} style={styles.clearButton}>
              <View style={styles.clearIconContainer}>
                <Ionicons name="close-circle" size={20} color={colors.textDim} />
              </View>
            </Pressable>
          )}
        </View>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.contentContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {!loading && !moviesUrl && !seriesUrl && (
          <View style={styles.emptyStateContainer}>
            <View style={[styles.emptyStateIconContainer, { backgroundColor: colors.primarySurface }]}>
              <Ionicons name="search" color={colors.primary} size={48} />
            </View>
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>{emptyStateContent.title}</Text>
            <Text style={[styles.emptyStateSubtitle, { color: colors.textMuted }]}>{emptyStateContent.subtitle}</Text>
          </View>
        )}
        {moviesUrl && <View style={styles.resultsSection}><PosterList apiUrl={moviesUrl} title="Movies" type="movie" /></View>}
        {seriesUrl && <View style={styles.resultsSection}><PosterList apiUrl={seriesUrl} title="Series" type="series" /></View>}
      </ScrollView>
      <BottomSpacing space={50} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  headerTitle: { fontSize: 34, fontWeight: '700', letterSpacing: 0.3 },
  searchSection: { paddingHorizontal: 16, paddingBottom: 20 },
  searchInputContainer: { maxWidth: 780, width: '100%', margin: 'auto', flexDirection: 'row', alignItems: 'center', borderRadius: 12, height: 48, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth },
  searchIconContainer: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 17, fontWeight: '400', letterSpacing: -0.2, outline: 'none' },
  clearButton: { marginLeft: 8, padding: 2 },
  clearIconContainer: { justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { paddingVertical: 40, alignItems: 'center' },
  contentContainer: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, marginTop: -80 },
  emptyStateIconContainer: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyStateTitle: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 10, letterSpacing: 0.2 },
  emptyStateSubtitle: { fontSize: 16, textAlign: 'center', lineHeight: 22, maxWidth: 300, fontWeight: '400', letterSpacing: -0.1 },
  resultsSection: { marginBottom: 24 },
});

export default SearchScreen;