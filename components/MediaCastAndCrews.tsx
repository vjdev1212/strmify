import React from "react";
import {
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { View, Text } from "./Themed";
import { useColorScheme } from "./useColorScheme";

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w200"; // TMDB image URL

const MediaCastAndCrews = ({ cast }: { cast: any[] }) => {

  const colorScheme = useColorScheme();
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {cast.map((member) => (
          <View key={member.id} style={styles.castContainer}>
            <Image
              source={{
                uri: `${IMAGE_BASE_URL}${member.profile_path}`
              }}
              style={[styles.profileImage]}
            />
            <Text style={[styles.name]} numberOfLines={1}>
              {member.name}
            </Text>
            <Text style={[styles.character]} numberOfLines={1}>
              {member.character || member.name}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  castContainer: {
    alignItems: "center",
    marginRight: 15,
    width: 110
  },
  profileImage: {
    width: 75,
    height: 75,
    borderRadius: 40
  },
  name: {
    marginTop: 5,
    fontSize: 12,
    textAlign: "center",
    color: 'white'
  },
  character: {
    marginTop: 2,
    fontSize: 10,
    textAlign: "center",
    color: 'white'
  },
});

export default MediaCastAndCrews;
