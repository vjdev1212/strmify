import React, { useMemo } from "react";
import { StyleSheet, ScrollView, Image, Pressable, useWindowDimensions } from "react-native";
import { View, Text } from "./Themed";
import { useTheme } from '@/context/ThemeContext';

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/h632";

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

const MediaCastAndCrews: React.FC<MediaCastAndCrewsProps> = ({ cast }) => {
  const { colors } = useTheme();
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
  const containerMargin = 15;

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

  if (cast.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingHorizontal: containerMargin }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cast & Crew</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingRight: containerMargin }]}
        style={[styles.scrollView, { paddingLeft: containerMargin }]}
      >
        {castItems.map((item, index) => (
          <Pressable
            key={item.uniqueKey}
            style={[styles.avatarContainer, { width: avatarSize + 20, marginRight: index === castItems.length - 1 ? 0 : spacing }]}
          >
            <View style={styles.avatarWrapper}>
              {item.hasImage ? (
                <Image source={{ uri: item.imageUri! }} style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]} />
              ) : (
                <View style={[styles.placeholderAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <Text style={[styles.initials, { color: colors.text, fontSize: avatarSize * 0.3 }]}>{item.initials}</Text>
                </View>
              )}
              <View style={[styles.avatarBorder, { width: avatarSize + 4, height: avatarSize + 4, borderRadius: (avatarSize + 4) / 2 }]} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.name, { color: colors.text, fontSize: Math.max(13, avatarSize * 0.12) }]} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
              <Text style={[styles.character, { color: colors.textMuted, fontSize: Math.max(11, avatarSize * 0.1) }]} numberOfLines={1} ellipsizeMode="tail">{item.displayCharacter}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: 15 },
  headerContainer: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '500', letterSpacing: 0.5 },
  scrollView: {},
  scrollContent: {},
  avatarContainer: { alignItems: "center", paddingVertical: 8 },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatar: {},
  placeholderAvatar: { justifyContent: "center", alignItems: "center", borderWidth: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  avatarBorder: { position: 'absolute', top: -2, left: -2, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)' },
  initials: { fontWeight: '600', letterSpacing: 1 },
  textContainer: { alignItems: "center", width: "100%", gap: 2 },
  name: { fontWeight: '500', textAlign: "center", lineHeight: 16 },
  character: { textAlign: "center", lineHeight: 14, opacity: 0.7 },
});

export default MediaCastAndCrews;