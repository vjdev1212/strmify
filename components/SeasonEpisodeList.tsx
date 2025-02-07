import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, Image, Pressable, Platform, useColorScheme, useWindowDimensions } from 'react-native';
import { Text, View } from './Themed';
import * as Haptics from 'expo-haptics';  // Importing Haptics for haptic feedback
import { formatDate } from '@/utils/Date';
import { isHapticsSupported } from '@/utils/platform';

interface Episode {
  name: string;
  title: string;
  season: number;
  episode: number;
  number: number;
  thumbnail: string;
  description: string;
  overview: string;
  firstAired: string;
  released: string;
}

interface SeasonEpisodeListProps {
  videos: Episode[];
  onEpisodeSelect: (season: number, episode: number) => void;
}

const SeasonEpisodeList: React.FC<SeasonEpisodeListProps> = ({ videos, onEpisodeSelect }) => {
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const isWeb = Platform.OS === 'web';
  const colorScheme = isWeb ? 'dark' : useColorScheme();
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;

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
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    setSelectedSeason(season);
    setSelectedEpisode(1);
  };

  const handleEpisodeSelect = async (season: number, episode: number) => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    setSelectedSeason(season);
    setSelectedEpisode(episode);
    onEpisodeSelect(season, episode);
  };

  const thumbnailBackgroundColor = colorScheme === 'dark' ? '#0f0f0f' : '#f0f0f0';

  return (
    <View style={styles.container}>
      <View>
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
            <Pressable
              style={[
                styles.seasonButton,
                {
                  backgroundColor: item !== selectedSeason && colorScheme === 'dark' ? '#101010' : '#f0f0f0',
                },
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
            </Pressable>
          )}
          contentContainerStyle={styles.seasonList}
          showsHorizontalScrollIndicator={false}
        />
      </View>
      <View style={styles.episodeList}>
        {groupedEpisodes[selectedSeason]?.map((item) => (
          <View style={[
            styles.episodeContainer,
            {
              marginHorizontal: 'auto',
              marginVertical: 10,
              width: '99%',
              maxWidth: 350,
            },
          ]}>
            <Pressable
              key={`${item.season}-${item.number}`}
              onPress={() => handleEpisodeSelect(item.season, item.number)}
            >
              <View>
                <View style={{ flexDirection: 'row', marginRight: 5 }}>
                  <View style={{ width: '50%' }}>
                    <Image
                      source={{ uri: item.thumbnail }}
                      style={[styles.thumbnail, {
                        backgroundColor: thumbnailBackgroundColor,
                        height: isPortrait ? 80 : null,
                        width: isPortrait ? null : 160,
                        aspectRatio: 16 / 9,
                      }]}
                    />
                  </View>
                  <View style={{ justifyContent: 'center', width: '50%' }}>
                    <Text style={[styles.episodeTitle]} numberOfLines={3}>
                      {item.episode || item.number}. {item.name || item.title}
                    </Text>
                    <Text style={[styles.episodeAired, {
                      color: colorScheme === 'dark' ? '#afafaf' : '#101010',
                    }]}>{
                        formatDate(item.firstAired) || formatDate(item.released)}
                    </Text>
                  </View>
                </View>
                <View style={{ justifyContent: 'center', width: '100%', marginRight: 5 }}>
                  <Text style={[styles.episodeDescription,
                  {
                    color: colorScheme === 'dark' ? '#dfdfdf' : '#101010',
                  }]} numberOfLines={5}>
                    {item.description || item.overview}
                  </Text>
                </View>
              </View>
            </Pressable>
          </View>
        ))}
      </View>
    </View >
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
  },
  seasonList: {
    paddingHorizontal: '3%',
    marginVertical: 10,
    justifyContent: 'flex-start',
    flexDirection: 'row',
    flexGrow: 1
  },
  seasonButton: {
    marginRight: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  selectedSeasonButton: {
    backgroundColor: '#535aff',
  },
  seasonText: {
    fontSize: 16,
  },
  selectedSeasonText: {
    color: '#fff',
  },
  episodeList: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    flexWrap: 'wrap',
  },
  episodeContainer: {
    marginHorizontal: 10,
    marginVertical: 10,
  },
  thumbnail: {
    borderRadius: 6,
    marginRight: 15,
    aspectRatio: 16 / 9,
    marginVertical: 20
  },
  episodeTitle: {
    fontSize: 14
  },
  episodeAired: {
    marginTop: 5,
    fontSize: 12,
  },
  episodeDescription: {
    marginTop: 5,
    fontSize: 14,
    marginRight: 10,
    textAlign: 'justify'
  },
});

export default SeasonEpisodeList;
