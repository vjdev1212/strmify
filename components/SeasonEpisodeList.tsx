import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, Image, TouchableOpacity, Platform } from 'react-native';
import { Text, View } from './Themed';
import * as Haptics from 'expo-haptics';  // Importing Haptics for haptic feedback
import { formatDate } from '@/utils/Date';
import { ScrollView } from 'react-native-gesture-handler';

interface Episode {
  name: string;
  season: number;
  episode: number;
  number: number;
  thumbnail: string;
  description: string;
  firstAired: string;
}

interface SeasonEpisodeListProps {
  videos: Episode[];
  onEpisodeSelect: (season: number, episode: number) => void;
}

const SeasonEpisodeList: React.FC<SeasonEpisodeListProps> = ({ videos, onEpisodeSelect }) => {
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);

  // Group episodes by season
  const groupedEpisodes = videos.reduce((acc, video) => {
    if (!acc[video.season]) {
      acc[video.season] = [];
    }
    acc[video.season].push(video);
    return acc;
  }, {} as Record<number, Episode[]>);

  // Handle initial selection when videos load
  useEffect(() => {
    if (videos.length > 0) {
      const defaultEpisode = videos.find((video) => video.season === 1 && video.number === 1);
      if (defaultEpisode) {
        setSelectedSeason(1);
        setSelectedEpisode(1);
      }
    }
  }, [videos]);

  if (!videos || videos.length === 0) {
    return null; // Hide component if no videos
  }

  const handleSeasonSelect = async (season: number) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedSeason(season);
    setSelectedEpisode(1);
  };

  const handleEpisodeSelect = async (season: number, episode: number) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedSeason(season);
    setSelectedEpisode(episode);
    onEpisodeSelect(season, episode);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={[
          ...Object.keys(groupedEpisodes)
            .map(Number)
            .filter((season) => season !== 0),
          0,
        ]}
        horizontal
        keyExtractor={(item) => `season-${item}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.seasonButton,
              item === selectedSeason && styles.selectedSeasonButton,
            ]}
            onPress={() => handleSeasonSelect(item)}  // Trigger haptic feedback on season press
          >
            <Text
              style={[
                styles.seasonText,
                item === selectedSeason && styles.selectedSeasonText,
              ]}
            >
              {item === 0 ? 'Specials' : `Season ${item}`}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.seasonList}
        showsHorizontalScrollIndicator={false}
      />
      <View style={styles.episodeList}>
        {groupedEpisodes[selectedSeason]?.map((item) => (
          <TouchableOpacity
            key={`${item.season}-${item.number}`} // Unique key for each episode
            style={[styles.episodeContainer]}
            onPress={() => handleEpisodeSelect(item.season, item.number)} // Trigger haptic feedback on episode press
          >
            <View style={{ flexDirection: 'row' }}>
              <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text style={styles.episodeTitle} numberOfLines={3}>
                  {item.episode}. {item.name}
                </Text>
                <Text style={styles.episodeAired}>
                  {formatDate(item.firstAired)}
                </Text>
              </View>
            </View>
            <View>
              <Text style={styles.episodeDescription} numberOfLines={10}>
                {item.description}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
  },
  seasonList: {
    paddingHorizontal: 5,
    marginVertical: 10,
  },
  seasonButton: {
    marginHorizontal: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  selectedSeasonButton: {
    backgroundColor: '#535aff',
  },
  seasonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedSeasonText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  episodeList: {
    paddingHorizontal: 5,
    paddingVertical: 10,
  },
  episodeContainer: {
    marginHorizontal: 10,
    marginVertical: 10
  },
  thumbnail: {
    width: 140,
    height: 90,
    borderRadius: 8,
    marginRight: 15,
  },
  episodeTitle: {
    fontSize: 14,
    width: '100%',
  },
  episodeAired: {
    marginTop: 5,
    fontSize: 13,
    color: '#888888',
  },
  episodeDescription: {
    marginTop: 15,
    fontSize: 14,
    color: '#888888',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});

export default SeasonEpisodeList;
