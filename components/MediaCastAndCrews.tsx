import React, { useMemo } from "react";
import {
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { View, Text } from "./Themed";

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w200";

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
  // Constants moved outside component for better performance
  const CAST_IMAGE_BG_COLOR = '#0f0f0f';
  const CAST_TEXT_COLOR = '#ffffff';
  const CAST_CHARACTER_TEXT_COLOR = '#eeeeee';

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
      <View style={styles.castCrewContainer}>
        <Text style={styles.castCrew}>Cast & Crew</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {castItems.map((item) => (
          <View key={item.id} style={styles.castContainer}>
            {item.hasImage ? (
              <Image
                source={{ uri: item.imageUri! }}
                style={[styles.profileImage, {
                  backgroundColor: CAST_IMAGE_BG_COLOR,
                }]}
              />
            ) : (
              <View style={[styles.placeholderImage, {
                backgroundColor: CAST_IMAGE_BG_COLOR,
              }]}>
                <Text style={[styles.initials, {
                  color: CAST_TEXT_COLOR
                }]}>{item.initials}</Text>
              </View>
            )}
            <Text style={[styles.name, {
              color: CAST_TEXT_COLOR
            }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.character, {
              color: CAST_CHARACTER_TEXT_COLOR
            }]} numberOfLines={1}>
              {item.displayCharacter}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  castContainer: {
    alignItems: "center",    
    width: 120,
    marginTop: 30
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 40,
  },
  placeholderImage: {
    width: 70,
    height: 70,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#111111'
  },
  initials: {
    fontSize: 25,
    color: "#ffffff",
  },
  name: {
    marginTop: 5,
    fontSize: 12,
    textAlign: "center",
    color: "#ffffff",
  },
  character: {
    marginTop: 2,
    fontSize: 11,
    textAlign: "center",
    color: "#ffffff",
  },
  castCrewContainer: {
    flex: 1,
  },
  castCrew: {
    fontWeight: '500',
    marginVertical: 10,
    fontSize: 16,
  }
});

export default MediaCastAndCrews;