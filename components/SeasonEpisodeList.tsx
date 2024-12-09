import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
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

  const handleEpisodeSelect = (season: number, episode: number) => {
    setSelectedSeason(season);
    setSelectedEpisode(episode);
    onEpisodeSelect(season, episode);
  };

  return (
    <View style={styles.container}>
      <Picker
        selectedValue={selectedSeason}
        onValueChange={(itemValue) => setSelectedSeason(itemValue)}
        style={styles.picker}
      >
        {Object.keys(groupedEpisodes).map((season) => (
          <Picker.Item key={season} label={`Season ${season}`} value={parseInt(season)} />
        ))}
      </Picker>

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
            <Text style={styles.episodeTitle}>{item.name}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.episodeList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
  },
  picker: {
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  episodeList: {
    paddingHorizontal: 5,
  },
  episodeContainer: {
    padding: 10,
  },
  thumbnail: {
    width: 150,
    height: 100,
    borderRadius: 8,
  },
  episodeTitle: {
    marginTop: 5,
    fontSize: 12,
    textAlign: 'center',
  },
});

export default SeasonEpisodeList;
