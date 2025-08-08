import React, { useMemo } from "react";
import {
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
} from "react-native";
import { View, Text } from "./Themed";

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/h632";

// Memoized helper function
const getInitials = (name: string): string => {
  if (!name) return "?";
  const parts = name.split(" ");
  const initials = parts.map(part => part.charAt(0)).slice(0, 2).join("");
  return initials.toUpperCase();
};

// Type definition for better type safety
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
  // Modern color scheme
  const COLORS = {
    background: '#000000',
    cardBackground: '#101010',
    primary: '#FFFFFF',
    secondary: '#B0B0B0',
    accent: '#191919',
    border: '#222222',
  };

  // Memoized cast items to prevent unnecessary re-renders
  const castItems = useMemo(() => {
    return cast.map((member) => {
      const hasImage = !!member.profile_path;
      const imageUri = hasImage ? `${IMAGE_BASE_URL}${member.profile_path}` : null;
      const initials = hasImage ? null : getInitials(member.name);
      const displayCharacter = member.character || member.name;

      return {
        id: member.id,
        name: member.name,
        hasImage,
        imageUri,
        initials,
        displayCharacter,
      };
    });
  }, [cast]);

  // Early return if no cast members
  if (cast.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={[styles.sectionTitle, { color: COLORS.primary }]}>
          Cast & Crew
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {castItems.map((item, index) => (
          <Pressable
            key={item.id}
            style={[
              styles.castCard,
              { backgroundColor: COLORS.cardBackground },
              index === 0 && styles.firstCard,
              index === castItems.length - 1 && styles.lastCard,
            ]}
            android_ripple={{ color: COLORS.accent, borderless: false }}
          >
            <View style={styles.imageContainer}>
              {item.hasImage ? (
                <Image
                  source={{ uri: item.imageUri! }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={[styles.placeholderImage, {
                  backgroundColor: COLORS.accent,
                  borderColor: COLORS.border,
                }]}>
                  <Text style={[styles.initials, {
                    color: COLORS.primary
                  }]}>{item.initials}</Text>
                </View>
              )}
            </View>

            <View style={styles.textContainer}>
              <Text
                style={[styles.name, { color: COLORS.primary }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.name}
              </Text>
              <Text
                style={[styles.character, { color: COLORS.secondary }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.displayCharacter}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 15,
  },
  headerContainer: {
    paddingHorizontal: 15,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  scrollView: {
    paddingLeft: 15,
  },
  scrollContent: {
    paddingRight: 15,
  },
  castCard: {
    width: 120,
    marginRight: 12,
    borderRadius: 6,
    paddingBottom: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  firstCard: {
    marginLeft: 0,
  },
  lastCard: {
    marginRight: 0,
  },
  imageContainer: {
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  profileImage: {
    width: 120,
    height: 170,
    borderTopStartRadius: 6,
    borderTopEndRadius: 6,
  },
  placeholderImage: {
    width: 120,
    height: 170,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderTopStartRadius: 6,
    borderTopEndRadius: 6,
  },
  initials: {
    fontSize: 34,
    fontWeight: '500',
    letterSpacing: 1,
  },
  textContainer: {
    alignItems: "center",
    width: "100%",
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 5
  },
  character: {
    fontSize: 12,
    fontWeight: '400',
    textAlign: "center",
    lineHeight: 16,
    opacity: 0.8,
    paddingHorizontal: 5
  },
});

export default MediaCastAndCrews;