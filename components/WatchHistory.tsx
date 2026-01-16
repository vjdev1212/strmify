import React, { useEffect, useState, useRef } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { View, Text } from './Themed';

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

const WATCH_HISTORY_KEY = StorageKeys.WATCH_HISTORY_KEY;
const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.58;
const CARD_HEIGHT = CARD_WIDTH * 0.55;
const CARD_SPACING = 16;

const WatchHistory: React.FC<WatchHistoryProps> = ({ onItemSelect, type }) => {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const animatedValues = useRef<Map<string, Animated.Value>>(new Map()).current;

  useEffect(() => {
    loadWatchHistory();
  }, []);

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
          return;
        }
        const filteredHistory = type
          ? parsedHistory.filter(item => item.type === type)
          : parsedHistory;
        setHistory(filteredHistory);
      }
    } catch (error) {
      console.error('Failed to load watch history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeHistoryItem = async (itemToRemove: WatchHistoryItem, itemKey: string) => {
    try {
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

          if (type === 'all') {
            setHistory(updatedHistory);
          } else {
            const filteredHistory = updatedHistory.filter(
              item => item.type === type
            );
            setHistory(filteredHistory);
          }

          animatedValues.delete(itemKey);
        }
      });
    } catch (error) {
      console.error('Failed to remove history item:', error);
    }
  };

  if (isLoading) {
    return null;
  }

  if (history.length === 0) {
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
        contentContainerStyle={styles.scrollContent}
        decelerationRate="normal"
      >
        {history.map((item, index) => {
          const itemKey = `${item.videoUrl}-${index}`;
          const animValue = getAnimatedValue(itemKey);

          return (
            <Animated.View
              key={itemKey}
              style={[
                styles.cardWrapper,
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
                <View style={styles.imageContainer}>
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
                    <Text style={styles.progressText}>{item.progress}%</Text>
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
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 14,
    opacity: 0.5,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: CARD_SPACING,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  card: {
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  imageContainer: {
    width: '100%',
    height: CARD_HEIGHT,
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
    backdropFilter: 'blur(10px)',
  },
  progressBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  progressText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
  },
  progressBackground: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#535aff',
    borderRadius: 2,
  },
  infoContainer: {
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
});

export default WatchHistory;