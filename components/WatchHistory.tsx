import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { View, Text } from './Themed';

interface WatchHistoryItem {
  title: string;
  videoUrl: string;
  progress: number;
  artwork: string;
  timestamp: number;
}

interface WatchHistoryProps {
  onItemSelect: (item: WatchHistoryItem) => void;
}

const WATCH_HISTORY_KEY = StorageKeys.WATCH_HISTORY_KEY;
const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.4;
const CARD_HEIGHT = CARD_WIDTH * 0.6;

const WatchHistory: React.FC<WatchHistoryProps> = ({ onItemSelect }) => {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWatchHistory();
  }, []);

  const loadWatchHistory = async () => {
    try {
      const historyJson = await storageService.getItem(WATCH_HISTORY_KEY);
      console.log('Loaded watch history JSON:', historyJson);
      if (historyJson) {
        const parsedHistory: WatchHistoryItem[] = JSON.parse(historyJson);
        setHistory(parsedHistory);
      }
    } catch (error) {
      console.error('Failed to load watch history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatProgress = (progress: number): string => {
    return `${Math.round(progress * 100)}%`;
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
        snapToInterval={CARD_WIDTH + 16}
      >
        {history.map((item, index) => (
          <TouchableOpacity
            key={`${item.videoUrl}-${index}`}
            style={styles.card}
            onPress={() => onItemSelect(item)}
            activeOpacity={0.8}
          >
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: item.artwork }}
                style={styles.artwork}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.gradient}
              />
              
              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBackground}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${item.progress * 100}%` },
                    ]}
                  />
                </View>
              </View>

              {/* Progress Percentage Badge */}
              <View style={styles.progressBadge}>
                <Text style={styles.progressText}>
                  {formatProgress(item.progress)}
                </Text>
              </View>
            </View>

            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    marginLeft: 16,
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  card: {
    width: CARD_WIDTH,
    marginRight: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    padding: 8,
  },
  progressBackground: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#E50914',
    borderRadius: 2,
  },
  progressBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backdropFilter: 'blur(10px)',
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  titleContainer: {
    padding: 12,
    backdropFilter: 'blur(10px)',
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 18,
  },
});

export default WatchHistory;