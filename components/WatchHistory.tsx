import React, { useEffect, useState, useRef } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { View, Text } from './Themed';
import * as Haptics from 'expo-haptics';

interface WatchHistoryItem {
  title: string;
  videoUrl: string;
  imdbid: string;
  type: string;
  season: string;
  episode: string;
  useVlcKit: string;
  progress: number;
  artwork: string;
  timestamp: number;
}

interface WatchHistoryProps {
  onItemSelect: (item: WatchHistoryItem) => void;
  type: 'all' | 'movie' | 'series';
}

const WatchHistory: React.FC<WatchHistoryProps> = ({ onItemSelect, type }) => {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const animatedValues = useRef<Map<string, Animated.Value>>(new Map()).current;

  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;

  // Constants moved inside to use window dimensions correctly
  const CARD_WIDTH = isPortrait ? 210 : 270;
  const CARD_HEIGHT = Math.round((CARD_WIDTH * 9) / 16);
  const CARD_SPACING = 16;

  const WATCH_HISTORY_KEY = StorageKeys.WATCH_HISTORY_KEY;

  useEffect(() => {
    loadWatchHistory();
  }, [type]); // Added type as dependency to reload if prop changes

  const getAnimatedValue = (key: string) => {
    if (!animatedValues.has(key)) {
      animatedValues.set(key, new Animated.Value(1));
    }
    return animatedValues.get(key)!;
  };

  const loadWatchHistory = async () => {
    try {
      const historyJson = storageService.getItem(WATCH_HISTORY_KEY);
      if (historyJson) {
        const parsedHistory: WatchHistoryItem[] = JSON.parse(historyJson);

        if (type === 'all') {
          setHistory(parsedHistory);
        } else {
          setHistory(parsedHistory.filter(item => item.type === type));
        }
      }
    } catch (error) {
      console.error('Failed to load watch history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeHistoryItem = async (itemToRemove: WatchHistoryItem, itemKey: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

      const animValue = getAnimatedValue(itemKey);

      Animated.timing(animValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(async () => {
        const historyJson = storageService.getItem(WATCH_HISTORY_KEY);
        if (historyJson) {
          const parsedHistory: WatchHistoryItem[] = JSON.parse(historyJson);
          const updatedHistory = parsedHistory.filter(
            item => !(item.videoUrl === itemToRemove.videoUrl &&
              item.timestamp === itemToRemove.timestamp)
          );

          storageService.setItem(
            WATCH_HISTORY_KEY,
            JSON.stringify(updatedHistory)
          );

          // Update local state based on current filter type
          if (type === 'all') {
            setHistory(updatedHistory);
          } else {
            setHistory(updatedHistory.filter(item => item.type === type));
          }

          animatedValues.delete(itemKey);
        }
      });
    } catch (error) {
      console.error('Failed to remove history item:', error);
    }
  };

  if (isLoading || history.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="play-circle-outline" size={22} color="#ffffff" />
          <Text style={styles.sectionTitle}>Continue Watching</Text>
        </View>
        <Text style={styles.sectionCount}>
          {history.length} {history.length === 1 ? 'item' : 'items'}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { gap: CARD_SPACING }]}
        decelerationRate="normal"
      >
        {history.map((item, index) => {
          const itemKey = `${item.videoUrl}-${item.timestamp}-${index}`;
          const animValue = getAnimatedValue(itemKey);

          return (
            <Animated.View
              key={itemKey}
              style={[
                { width: CARD_WIDTH },
                {
                  opacity: animValue,
                  transform: [{ scale: animValue }],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.card}
                onPress={() => onItemSelect(item)}
                activeOpacity={0.8}
              >
                <View style={[styles.imageContainer, { height: CARD_HEIGHT }]}>
                  <Image
                    source={{ uri: item.artwork }}
                    style={styles.backdrop}
                    resizeMode="cover"
                  />

                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      removeHistoryItem(item, itemKey);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>

                  <View style={styles.progressBadge}>
                    <Text style={styles.progressText}>{Math.round(item.progress)}%</Text>
                  </View>

                  <View style={styles.progressContainer}>
                    <View style={styles.progressBackground}>
                      <View
                        style={[
                          styles.progressBar,
                          { width: `${item.progress}%` },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.infoContainer}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    marginBottom: 10
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  sectionCount: {
    fontSize: 14,
    opacity: 0.5,
    fontWeight: '500',
    color: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    padding: 6,
  },
  progressBadge: {
    position: 'absolute',
    bottom: 12, // Moved slightly up so it doesn't overlap progress bar
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  progressText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 0, // Fill the width for a cleaner look
  },
  progressBackground: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#535aff',
  },
  infoContainer: {
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 18,
    color: '#fff',
  },
});

export default WatchHistory;