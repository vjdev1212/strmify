import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Image, FlatList, useWindowDimensions } from "react-native";
import { View, Text } from "./Themed";
import { useTheme } from '@/context/ThemeContext';
import { spacing as themeSpacing, typography } from '@/constants/theme';
import { NativeButton } from '@/components/native-ui-controls';
import PersonDetailsScreen from '@/components/person-details-screen';

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w342";

const getInitials = (name: string): string => {
  if (!name) return "?";
  return name.split(" ").map(p => p.charAt(0)).slice(0, 2).join("").toUpperCase();
};

interface CastMember {
  id: number;
  name: string;
  profile_path?: string;
  character?: string;
}

interface MediaCastAndCrewsProps {
  cast: CastMember[];
}

interface CastListItemProps {
  item: {
    id: number;
    uniqueKey: string;
    name: string;
    hasImage: boolean;
    imageUri: string | null;
    initials: string | null;
    displayCharacter: string;
  };
  onSelectPerson: (personId: number) => void;
  avatarSize: number;
  textColor: string;
  mutedTextColor: string;
  cardColor: string;
  borderColor: string;
  accentColor: string;
}

const CastListItem = React.memo(({
  item,
  onSelectPerson,
  avatarSize,
  textColor,
  mutedTextColor,
  cardColor,
  borderColor,
  accentColor,
}: CastListItemProps) => (
  <NativeButton
    variant="text"
    accessibilityLabel={`View ${item.name}'s profile`}
    seedColor={accentColor}
    onPress={() => onSelectPerson(item.id)}
    style={[styles.avatarContainer, { width: avatarSize + 20 }]}
  >
    <View style={styles.avatarContent}>
      <View style={styles.avatarWrapper}>
        {item.hasImage ? (
          <Image source={{ uri: item.imageUri! }} style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]} />
        ) : (
          <View style={[styles.placeholderAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, backgroundColor: cardColor, borderColor }]}>
            <Text style={[styles.initials, { color: textColor, fontSize: avatarSize * 0.3 }]}>{item.initials}</Text>
          </View>
        )}
        <View style={[styles.avatarBorder, { width: avatarSize + 4, height: avatarSize + 4, borderRadius: (avatarSize + 4) / 2 }]} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.name, { color: textColor, fontSize: Math.max(13, avatarSize * 0.12) }]} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
        <Text style={[styles.character, { color: mutedTextColor, fontSize: Math.max(11, avatarSize * 0.1) }]} numberOfLines={1} ellipsizeMode="tail">{item.displayCharacter}</Text>
      </View>
    </View>
  </NativeButton>
));

const MediaCastAndCrews: React.FC<MediaCastAndCrewsProps> = ({ cast }) => {
  const { colors } = useTheme();
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;
  const shortSide = Math.min(width, height);

  const getCastPerScreen = () => {
    if (shortSide < 580) return isPortrait ? 4 : 6;
    if (shortSide < 1024) return isPortrait ? 7 : 9;
    if (shortSide < 1440) return isPortrait ? 8 : 10;
    return isPortrait ? 8 : 12;
  };

  const castPerScreen = getCastPerScreen();
  const spacing = 16;
  const containerMargin = themeSpacing.mdLg;

  const avatarSize = useMemo(() => {
    const totalSpacing = spacing * (castPerScreen - 1);
    const totalMargins = containerMargin * 2;
    const availableWidth = width - totalSpacing - totalMargins;
    const calculatedSize = availableWidth / castPerScreen;
    const minSize = shortSide < 1024 ? 80 : 60;
    return Math.max(minSize, Math.min(120, calculatedSize));
  }, [width, castPerScreen, shortSide]);

  const castItems = useMemo(() => cast.map((member, index) => {
    const hasImage = !!member.profile_path;
    return {
      id: member.id,
      uniqueKey: `${member.id}-${index}`,
      name: member.name,
      hasImage,
      imageUri: hasImage ? `${IMAGE_BASE_URL}${member.profile_path}` : null,
      initials: hasImage ? null : getInitials(member.name),
      displayCharacter: member.character || member.name,
    };
  }), [cast]);

  const renderCastItem = useCallback(({ item }: { item: (typeof castItems)[number] }) => (
    <CastListItem
      item={item}
      onSelectPerson={setSelectedPersonId}
      avatarSize={avatarSize}
      textColor={colors.text}
      mutedTextColor={colors.textMuted}
      cardColor={colors.backgroundCard}
      borderColor={colors.border}
      accentColor={colors.primary}
    />
  ), [avatarSize, colors.backgroundCard, colors.border, colors.primary, colors.text, colors.textMuted]);

  if (cast.length === 0) return null;

  return (
    <>
      <View style={styles.container}>
        <View style={[styles.headerContainer, { paddingHorizontal: containerMargin }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Cast & Crew</Text>
        </View>
        <FlatList
          horizontal
          data={castItems}
          keyExtractor={(item) => item.uniqueKey}
          initialNumToRender={Math.min(castPerScreen + 2, castItems.length)}
          maxToRenderPerBatch={castPerScreen}
          windowSize={3}
          showsHorizontalScrollIndicator={false}
          style={{ height: avatarSize + 60 }}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: containerMargin, gap: spacing }]}
          renderItem={renderCastItem}
        />
      </View>
      <PersonDetailsScreen
        visible={selectedPersonId !== null}
        personId={selectedPersonId}
        onClose={() => setSelectedPersonId(null)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: themeSpacing.sm },
  headerContainer: { marginBottom: themeSpacing.md },
  sectionTitle: { ...typography.headline },
  scrollContent: { flexDirection: 'row' },
  avatarContainer: { paddingVertical: 8 },
  avatarContent: { alignItems: 'center' },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatar: {},
  placeholderAvatar: { justifyContent: "center", alignItems: "center", borderWidth: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  avatarBorder: { position: 'absolute', top: -2, left: -2, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)' },
  initials: { fontWeight: '600', letterSpacing: 1 },
  textContainer: { alignItems: "center", width: "100%", gap: 2 },
  name: { fontWeight: '500', textAlign: "center", lineHeight: 16 },
  character: { textAlign: "center", lineHeight: 14, opacity: 0.7 },
});

export default React.memo(MediaCastAndCrews);