import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { Text, View } from './Themed';


interface Episode {
  name: string;
  season: number;
  number: number;
  thumbnail: string;
  description: string;
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
        onEpisodeSelect(1, 1);
      }
    }
  }, [videos]);

  if (!videos || videos.length === 0) {
    return null; // Hide component if no videos
  }
  const handleSeasonSelect = (season: number) => {
    setSelectedSeason(season);
    setSelectedEpisode(1); // Reset to first episode when season changes
    onEpisodeSelect(season, 1);
  };

  const handleEpisodeSelect = (season: number, episode: number) => {
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
            onPress={() => handleSeasonSelect(item)}
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
      <FlatList
        data={groupedEpisodes[selectedSeason]}
        horizontal
        keyExtractor={(item) => `${item.season}-${item.number}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.episodeContainer
            ]}
            onPress={() => handleEpisodeSelect(item.season, item.number)}
          >
            <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
            <Text style={styles.episodeTitle} numberOfLines={1}>{item.number}. {item.name}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.episodeList}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
  },
  seasonList: {
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  seasonButton: {
    marginHorizontal: 5,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 4,
  },
  selectedSeasonButton: {
    backgroundColor: '#fc7703',
  },
  seasonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedSeasonText: {
    fontWeight: 'bold',
    color: '#fff'
  },
  episodeList: {
    paddingHorizontal: 5,
    paddingVertical: 10
  },
  episodeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  thumbnail: {
    width: 200,
    height: 115,
    borderRadius: 4,
  },
  episodeTitle: {
    marginTop: 15,
    fontSize: 14,
    maxWidth: 200,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});

export default SeasonEpisodeList;
