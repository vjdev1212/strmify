import React, { useMemo } from "react";
import {
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  useWindowDimensions,
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
  const { width, height } = useWindowDimensions();

  // Device orientation and size logic
  const isPortrait = height > width;
  const shortSide = Math.min(width, height);

  // Device category based on shortSide
  const getCastPerScreen = () => {
    if (shortSide < 580) return isPortrait ? 4 : 6;       // mobile - more avatars fit
    if (shortSide < 1024) return isPortrait ? 7 : 9;      // tablet
    if (shortSide < 1440) return isPortrait ? 8 : 10;     // laptop
    return isPortrait ? 8 : 12;                           // desktop
  };

  const castPerScreen = getCastPerScreen();
  const spacing = 16;
  const containerMargin = 15;

  const avatarSize = useMemo(() => {
    const totalSpacing = spacing * (castPerScreen - 1);
    const totalMargins = containerMargin * 2; // left + right
    const availableWidth = width - totalSpacing - totalMargins;
    const calculatedSize = availableWidth / castPerScreen;

    // Increase minimum size for smaller screens, keep reasonable maximum
    const minSize = shortSide < 1024 ? 80 : 60; // Larger minimum for mobile devices
    return Math.max(minSize, Math.min(120, calculatedSize));
  }, [width, castPerScreen, shortSide]);

  // Modern color scheme
  const COLORS = {
    background: '#000000',
    primary: '#FFFFFF',
    secondary: '#B0B0B0',
    accent: '#333333',
    border: '#444444',
    placeholderBg: '#1a1a1a',
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
      <View style={[styles.headerContainer, { paddingHorizontal: containerMargin }]}>
        <Text style={[styles.sectionTitle, { color: COLORS.primary }]}>
          Cast & Crew
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingRight: containerMargin }]}
        style={[styles.scrollView, { paddingLeft: containerMargin }]}
      >
        {castItems.map((item, index) => (
          <Pressable
            key={item.id}
            style={[
              styles.avatarContainer,
              {
                width: avatarSize + 20, // Extra space for text
                marginRight: index === castItems.length - 1 ? 0 : spacing,
              }
            ]}
          >
            <View style={styles.avatarWrapper}>
              {item.hasImage ? (
                <Image
                  source={{ uri: item.imageUri! }}
                  style={[styles.avatar, {
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: avatarSize / 2,
                  }]}
                />
              ) : (
                <View style={[styles.placeholderAvatar, {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                  backgroundColor: COLORS.placeholderBg,
                  borderColor: COLORS.border,
                }]}>
                  <Text style={[styles.initials, {
                    color: COLORS.primary,
                    fontSize: avatarSize * 0.3, // Scale initials with avatar size
                  }]}>{item.initials}</Text>
                </View>
              )}

              {/* Optional: Add online indicator or badge */}
              <View style={[styles.avatarBorder, {
                width: avatarSize + 4,
                height: avatarSize + 4,
                borderRadius: (avatarSize + 4) / 2,
              }]} />
            </View>

            <View style={styles.textContainer}>
              <Text
                style={[styles.name, {
                  color: COLORS.primary,
                  fontSize: Math.max(13, avatarSize * 0.12), // Scale text with avatar
                }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.name}
              </Text>
              <Text
                style={[styles.character, {
                  color: COLORS.secondary,
                  fontSize: Math.max(11, avatarSize * 0.1), // Scale text with avatar
                }]}
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  scrollView: {
    // paddingLeft handled dynamically
  },
  scrollContent: {
    // paddingRight handled dynamically
  },
  avatarContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  avatarWrapper: {
    position: 'relative',
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
  avatar: {
    // Dynamic styles applied inline
  },
  placeholderAvatar: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  initials: {
    fontWeight: '600',
    letterSpacing: 1,
  },
  textContainer: {
    alignItems: "center",
    width: "100%",
    gap: 2,
  },
  name: {
    fontWeight: '500',
    textAlign: "center",
    lineHeight: 16,
  },
  character: {
    textAlign: "center",
    lineHeight: 14,
    opacity: 0.7,
  },
});

export default MediaCastAndCrews;