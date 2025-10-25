import React, { useEffect, useState, useRef } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
const CARD_WIDTH = 200;
const CARD_HEIGHT = (CARD_WIDTH * 9) / 16;

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
      const historyJson = await storageService.getItem(WATCH_HISTORY_KEY);
      if (historyJson) {
        const parsedHistory: WatchHistoryItem[] = JSON.parse(historyJson);
        if(type === 'all') {
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
      
      // Animate out
      Animated.timing(animValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(async () => {
        // Remove from storage after animation
        const historyJson = await storageService.getItem(WATCH_HISTORY_KEY);
        if (historyJson) {
          const parsedHistory: WatchHistoryItem[] = JSON.parse(historyJson);
          const updatedHistory = parsedHistory.filter(
            item => !(item.videoUrl === itemToRemove.videoUrl && 
                     item.timestamp === itemToRemove.timestamp)
          );
          
          await storageService.setItem(
            WATCH_HISTORY_KEY,
            JSON.stringify(updatedHistory)
          );
          
          // Update local state
          if(type === 'all') {
            setHistory(updatedHistory);
          } else {
            const filteredHistory = updatedHistory.filter(
              item => item.type === type
            );
            setHistory(filteredHistory);
          }
          
          // Clean up animated value
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
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Continue Watching</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 12}
      >
        {history.map((item, index) => {
          const itemKey = `${item.videoUrl}-${index}`;
          const animValue = getAnimatedValue(itemKey);
          
          return (
          <Animated.View 
            key={itemKey}
            style={{
              opacity: animValue,
              transform: [
                {
                  scale: animValue,
                },
                {
                  translateX: animValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 0],
                  }),
                },
              ],
            }}
          >
            <TouchableOpacity
              style={styles.card}
              onPress={() => onItemSelect(item)}
              activeOpacity={0.8}
            >
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: item.artwork }}
                  style={styles.artwork}
                  resizeMode="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.gradient} />

                <View style={styles.progressContainer}>
                  <View style={styles.progressBackground}>
                    <View
                      style={[
                        styles.progressBar,
                        { width: `${item.progress}%` },
                      ]} />
                  </View>
                </View>

                <View style={styles.progressBadge}>
                  <Text style={styles.progressText}>
                    {item.progress}%
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    removeHistoryItem(item, itemKey);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-outline" size={16} color="rgba(255, 255, 255, 0.9)" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
          </Animated.View>
        )})}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 12,
    marginLeft: 16,
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  card: {
    width: CARD_WIDTH,
    marginRight: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  imageContainer: {
    width: '100%',
    height: CARD_HEIGHT,
    position: 'relative',
  },
  artwork: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2a2a2a',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 6,
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
    backgroundColor: 'rgba(83, 90, 255, 0.5)',
    borderRadius: 2,
  },
  progressBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backdropFilter: 'blur(10px)',
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: 4,
    backdropFilter: 'blur(10px)',
  },
  titleContainer: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    overflow: 'hidden',
    width: CARD_WIDTH,
  },
  title: {
    fontSize: 13,
    color: '#FFFFFF',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: 16,
  },
});

export default WatchHistory;