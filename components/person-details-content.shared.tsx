import React, { useState } from 'react';
import { FlatList, Image, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, View } from '@/components/Themed';
import { NativeButton } from '@/components/native-ui-controls';
import PersonDetailsCloseButton from '@/components/person-details-close-button';
import PersonBiography from '@/components/person-biography';
import { radius, spacing, typography } from '@/constants/theme';
import type { Credit, PersonDetailsContentProps } from '@/components/person-details-types';

const FILMOGRAPHY_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342';

const FILMOGRAPHY_BATCH_SIZE = 5;

const FilmographyItem = React.memo(function FilmographyItem({
  item,
  onPress,
  colors,
  posterWidth,
}: {
  item: Credit;
  onPress: (credit: Credit) => void;
  colors: PersonDetailsContentProps['colors'];
  posterWidth: number;
}) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = item.poster_path ? `${FILMOGRAPHY_IMAGE_BASE}${item.poster_path}` : null;
  const releaseDate = item.release_date || item.first_air_date || '';
  const title = item.title || item.name || 'Untitled';
  const role = item.character || item.job;
  const posterHeight = posterWidth * 1.5;

  return (
    <NativeButton
      variant="text"
      accessibilityLabel={`Open ${title}`}
      seedColor={colors.primary}
      onPress={() => onPress(item)}
      style={[styles.filmographyItem, { width: posterWidth }]}
    >
      <View style={[styles.filmographyArtwork, { width: posterWidth, height: posterHeight, backgroundColor: colors.backgroundCard }]}>
        {imageUrl && !imageError ? (
          <Image
            source={{ uri: imageUrl }}
            onError={() => setImageError(true)}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.filmographyPlaceholder]}>
            <Ionicons name="film-outline" size={28} color={colors.textMuted} />
          </View>
        )}
      </View>
      <Text numberOfLines={1} style={[styles.filmographyTitle, { width: posterWidth, color: colors.text }]}>{title}</Text>
      <Text numberOfLines={2} style={[styles.filmographyMeta, { color: colors.textMuted }]}>
        {[releaseDate.slice(0, 4), item.media_type === 'movie' ? 'Movie' : 'TV'].filter(Boolean).join(' · ')}
      </Text>
      {role ? <Text numberOfLines={2} style={[styles.creditRole, { color: colors.textMuted }]}>{role}</Text> : null}
      {item.department ? (
        <Text numberOfLines={1} style={[styles.filmographyMeta, { color: colors.textMuted }]}>{item.department}</Text>
      ) : null}
      {item.episode_count ? (
        <Text numberOfLines={1} style={[styles.filmographyMeta, { color: colors.textMuted }]}>
          {item.episode_count} {item.episode_count === 1 ? 'episode' : 'episodes'}
        </Text>
      ) : null}
    </NativeButton>
  );
});

function FilmographySection({
  title,
  credits,
  onPress,
  colors,
  posterWidth,
}: {
  title: string;
  credits: Credit[];
  onPress: (credit: Credit) => void;
  colors: PersonDetailsContentProps['colors'];
  posterWidth: number;
}) {
  if (credits.length === 0) return null;

  return (
    <View style={styles.filmographySection}>
      <Text style={[styles.sectionTitle, styles.filmographyHeading, { color: colors.text }]}>{title}</Text>
      <FlatList
        horizontal
        data={credits}
        keyExtractor={(item) => `${item.media_type}-${item.id}`}
        renderItem={({ item }) => (
          <FilmographyItem item={item} onPress={onPress} colors={colors} posterWidth={posterWidth} />
        )}
        initialNumToRender={FILMOGRAPHY_BATCH_SIZE}
        maxToRenderPerBatch={FILMOGRAPHY_BATCH_SIZE}
        windowSize={3}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filmographyList}
        getItemLayout={(_, index) => ({
          length: posterWidth + spacing.md,
          offset: (posterWidth + spacing.md) * index,
          index,
        })}
      />
    </View>
  );
}

function getGenderLabel(gender?: number) {
  switch (gender) {
    case 1:
      return 'Female';
    case 2:
      return 'Male';
    case 3:
      return 'Non-binary';
    default:
      return undefined;
  }
}

export default function PersonDetailsContent({
  colors,
  loading,
  error,
  person,
  castCredits,
  crewCredits,
  profileImage,
  profileImageLoading,
  profileImageError,
  onProfileImageLoad,
  onProfileImageError,
  onRetry,
  onClose,
  onCreditPress,
}: PersonDetailsContentProps) {
  const profileFacts = person
    ? [
        person.known_for_department ? { label: 'Known for', value: person.known_for_department } : null,
        getGenderLabel(person.gender) ? { label: 'Gender', value: getGenderLabel(person.gender)! } : null,
        person.birthday ? { label: person.deathday ? 'Born' : 'Birthday', value: person.birthday } : null,
        person.deathday ? { label: 'Died', value: person.deathday } : null,
        person.place_of_birth ? { label: 'Place of birth', value: person.place_of_birth } : null,
      ].filter((fact): fact is { label: string; value: string } => fact !== null)
    : [];
  const { width } = useWindowDimensions();
  const heroWidth = width;
  const heroHeight = width;
  const posterWidth = Math.max(100, Math.min(140, (width - spacing.mdLg * 2 - spacing.md * 2) / 3));

  return (
    <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error || !person ? (
        <View style={styles.stateContainer}>
          <Text style={[styles.errorText, { color: colors.textMuted }]}>{error ?? 'Profile unavailable.'}</Text>
          <NativeButton
            label="Try again"
            accessibilityLabel="Retry loading profile"
            onPress={onRetry}
            seedColor={colors.primary}
            style={styles.retryButton}
          />
        </View>
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={[styles.hero, { width: heroWidth, height: heroHeight, backgroundColor: colors.backgroundCard }]}>
            {profileImage && !profileImageError ? (
              <Image
                source={{ uri: profileImage }}
                onLoad={onProfileImageLoad}
                onError={onProfileImageError}
                style={[StyleSheet.absoluteFill, styles.heroImage]}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.profilePlaceholder, styles.heroImage]}>
                <Ionicons name="person-circle-outline" size={88} color={colors.textMuted} />
              </View>
            )}
            {profileImage && profileImageLoading && !profileImageError ? (
              <View pointerEvents="none" style={styles.heroLoader}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null}
          </View>

          <View style={styles.details}>
            <Text style={[styles.personName, { color: colors.text }]} numberOfLines={2}>{person.name}</Text>
            {person.known_for_department ? (
              <Text style={[styles.personDepartment, { color: colors.textMuted }]}>{person.known_for_department}</Text>
            ) : null}
            {profileFacts.length > 0 ? (
              <View style={styles.profileFacts}>
                {profileFacts.map((fact) => (
                  <View key={fact.label} style={[styles.profileFact, { backgroundColor: colors.backgroundCard }]}>
                    <Text style={[styles.factLabel, { color: colors.textMuted }]}>{fact.label}</Text>
                    <Text style={[styles.personMeta, { color: colors.text }]}>{fact.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {person.also_known_as && person.also_known_as.length > 0 ? (
              <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Also known as</Text>
                <Text style={[styles.personMeta, { color: colors.textMuted }]}>
                  {person.also_known_as.slice(0, 8).join(', ')}
                </Text>
              </View>
            ) : null}

            {person.biography ? (
              <PersonBiography
                biography={person.biography}
                width={width - spacing.mdLg * 2}
                colors={colors}
              />
            ) : null}

            {castCredits.length > 0 ? (
              <FilmographySection title="Cast" credits={castCredits} onPress={onCreditPress} colors={colors} posterWidth={posterWidth} />
            ) : null}

            {crewCredits.length > 0 ? (
              <FilmographySection title="Crew" credits={crewCredits} onPress={onCreditPress} colors={colors} posterWidth={posterWidth} />
            ) : castCredits.length === 0 ? (
              <View style={styles.filmographySection}>
                <Text style={[styles.sectionTitle, styles.filmographyHeading, { color: colors.text }]}>Credits</Text>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No cast or crew credits available.</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}
      <View style={styles.closeButton}>
        <PersonDetailsCloseButton onPress={onClose} color={colors.text} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1 },
  stateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  content: { paddingBottom: spacing.xxl },
  closeButton: { position: 'absolute', top: spacing.md, right: spacing.md, zIndex: 2 },
  hero: { position: 'relative', justifyContent: 'flex-end', overflow: 'hidden' },
  heroImage: { borderRadius: 0 },
  profilePlaceholder: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  heroLoader: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  details: { paddingHorizontal: spacing.mdLg, paddingTop: spacing.md, gap: spacing.mdLg },
  personName: { ...typography.title, textAlign: 'center', fontSize: 24, lineHeight: 30, paddingHorizontal: spacing.sm },
  personDepartment: { ...typography.caption, textAlign: 'center', marginTop: -spacing.md },
  profileFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  profileFact: { flexBasis: '48%', flexGrow: 1, minWidth: 0, padding: spacing.md, borderRadius: radius.md, gap: spacing.xs },
  factLabel: { ...typography.caption, textTransform: 'uppercase', fontSize: 11 },
  personMeta: { ...typography.caption },
  infoCard: { gap: spacing.sm, backgroundColor: 'transparent', borderRadius: radius.md, padding: spacing.md },
  sectionTitle: { ...typography.headline },
  filmographySection: { gap: spacing.md, marginHorizontal: -spacing.mdLg },
  filmographyHeading: { paddingHorizontal: spacing.lg },
  filmographyList: { gap: spacing.md, paddingHorizontal: spacing.mdLg },
  filmographyItem: { flexShrink: 0, gap: spacing.xs, alignItems: 'flex-start' },
  filmographyArtwork: { borderRadius: radius.md, overflow: 'hidden' },
  filmographyPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  filmographyTitle: { ...typography.caption, fontWeight: '600' },
  filmographyMeta: { ...typography.caption },
  creditRole: { ...typography.caption, fontSize: 11, minHeight: 28 },
  emptyText: { ...typography.subhead },
  errorText: { ...typography.body, textAlign: 'center' },
  retryButton: { paddingHorizontal: spacing.md },
});
