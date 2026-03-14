import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Text, View } from './Themed';
import { formatDate } from '@/utils/Date';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface Language { english_name: string; }
interface MediaContentDetailsListProps {
  type?: 'movie' | 'tv';
  genre?: string[];
  runtime?: string;
  imdbRating?: string;
  released?: string;
  country?: string[];
  languages?: Language[];
}

const UNKNOWN_TEXT = 'Unknown';
const NOT_RATED_TEXT = 'Not Rated';
const STAR_COLOR = '#E6BD37';
const STAR_SIZE = 14;
const containerMargin = 15;

const countryCodeToName = (code: string) => {
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) || code; }
  catch { return code; }
};

const MediaContentDetailsList: React.FC<MediaContentDetailsListProps> = ({
  type = 'movie', genre = [], runtime = UNKNOWN_TEXT, imdbRating = UNKNOWN_TEXT,
  released = UNKNOWN_TEXT, country = [], languages = [],
}) => {
  const { colors } = useTheme();

  const computedValues = useMemo(() => {
    const isMovie = type === 'movie';
    const hasRating = imdbRating !== '0.0' && imdbRating !== UNKNOWN_TEXT;
    return {
      isMovie, hasRating,
      formattedDate: formatDate(released),
      genreText: genre.length > 0 ? genre.join(', ') : UNKNOWN_TEXT,
      countryText: country.length > 0 ? country.map(countryCodeToName).join(', ') : UNKNOWN_TEXT,
      languagesText: languages.length > 0 ? languages.map(l => l.english_name).join(', ') : UNKNOWN_TEXT,
      runtimeText: runtime !== '0' ? `${runtime} mins` : `${UNKNOWN_TEXT} mins`,
      ratingText: hasRating ? imdbRating : NOT_RATED_TEXT,
      releasedLabel: isMovie ? 'Released On:' : 'First Aired On:',
    };
  }, [type, genre, runtime, imdbRating, released, country, languages]);

  const renderTableRow = (label: string, value: string | React.ReactNode, key: string, isLast?: boolean) => (
    <View key={key} style={[styles.tableRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <View style={styles.labelCell}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </View>
      <View style={styles.valueCell}>
        {typeof value === 'string'
          ? <Text numberOfLines={2} style={[styles.value, { color: colors.textMuted }]}>{value}</Text>
          : value}
      </View>
    </View>
  );

  const renderRatingValue = () => (
    <View style={styles.ratingContainer}>
      <Text style={[styles.value, { color: colors.textMuted }]}>{computedValues.ratingText}</Text>
      {computedValues.hasRating && <View style={styles.starWrapper}><FontAwesome name="star" size={STAR_SIZE} color={STAR_COLOR} /></View>}
    </View>
  );

  const tableData = [
    { key: 'released', label: computedValues.releasedLabel, value: computedValues.formattedDate },
    { key: 'rating', label: 'IMDB Rating:', value: renderRatingValue() },
    { key: 'genre', label: 'Genre:', value: computedValues.genreText },
    ...(computedValues.isMovie ? [{ key: 'runtime', label: 'Runtime:', value: computedValues.runtimeText }] : []),
    { key: 'country', label: 'Country:', value: computedValues.countryText },
    { key: 'languages', label: 'Languages:', value: computedValues.languagesText },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingHorizontal: containerMargin }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Information</Text>
      </View>
      {tableData.map((item, index) => renderTableRow(item.label, item.value, item.key, index === tableData.length - 1))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 5, marginVertical: 20 },
  headerContainer: { marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '500', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', marginHorizontal: 20, paddingVertical: 10, alignItems: 'center' },
  labelCell: { width: 120, paddingRight: 16, justifyContent: 'center' },
  valueCell: { flex: 1, justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '500' },
  value: { fontSize: 14, lineHeight: 20 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  starWrapper: { marginLeft: 8, paddingTop: 1 },
});

export default MediaContentDetailsList;