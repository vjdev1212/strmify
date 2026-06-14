import React, { useState, useEffect, useRef } from 'react';
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
import { useTheme } from '@/context/ThemeContext';

export interface WatchHistoryItem {
  title: string;
  videoUrl: string;
  imdbid: string;
  type: string;
  season: string;
  episode: string;
  useKsPlayer?: string;
  positionSeconds: number;
  durationSeconds?: number;
  artwork: string;
  timestamp: number;
}

type PersistedWatchHistoryItem = WatchHistoryItem & {
  durationSeconds?: unknown;
  progress?: unknown;
};

interface WatchHistoryProps {
  onItemSelect: (item: WatchHistoryItem) => void;
  type: 'all' | 'movie' | 'series';
}

const isValidWatchHistoryItem = (item: WatchHistoryItem): boolean =>
  Number.isFinite(item.positionSeconds) &&
  item.positionSeconds > 0;

const formatDuration = (secs: number): string => {
  const s = Math.floor(Number(secs) || 0);
  if (!Number.isFinite(s) || s <= 0) return '0s';
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
};

const formatTimeShort = (secs: number): string => {
  const s = Math.floor(Number(secs) || 0);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const WatchHistory: React.FC<WatchHistoryProps> = ({ onItemSelect, type }) => {
  const { colors } = useTheme();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const animatedValues = useRef<Map<string, Animated.Value>>(new Map()).current;

  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;
  const CARD_WIDTH = isPortrait ? 210 : 270;
  const CARD_HEIGHT = Math.round((CARD_WIDTH * 9) / 16);
  const CARD_SPACING = 16;

  useEffect(() => { loadWatchHistory(); }, [type]);

  const getAnimatedValue = (key: string) => {
    if (!animatedValues.has(key)) animatedValues.set(key, new Animated.Value(1));
    return animatedValues.get(key)!;
  };

  const loadWatchHistory = async () => {
    try {
      const historyJson = storageService.getItem(StorageKeys.WATCH_HISTORY_KEY);
      if (historyJson) {
        const parsed: PersistedWatchHistoryItem[] = JSON.parse(historyJson);
        const normalized = parsed
          .map(p => ({
            ...p,
            durationSeconds: p.durationSeconds ? Number(p.durationSeconds) : undefined,
          })) as unknown as WatchHistoryItem[];
        const validHistory = normalized.filter(isValidWatchHistoryItem);
        storageService.setItem(StorageKeys.WATCH_HISTORY_KEY, JSON.stringify(validHistory));
        setHistory(type === 'all' ? validHistory : validHistory.filter(item => item.type === type));
      }
    } catch (error) {
      console.error('Failed to load watch history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeHistoryItem = async (itemToRemove: WatchHistoryItem, itemKey: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const animValue = getAnimatedValue(itemKey);
      Animated.timing(animValue, { toValue: 0, duration: 300, useNativeDriver: true }).start(async () => {
        const historyJson = storageService.getItem(StorageKeys.WATCH_HISTORY_KEY);
        if (historyJson) {
          const parsed: WatchHistoryItem[] = JSON.parse(historyJson);
          const updated = parsed.filter(item => !(item.videoUrl === itemToRemove.videoUrl && item.timestamp === itemToRemove.timestamp));
          storageService.setItem(StorageKeys.WATCH_HISTORY_KEY, JSON.stringify(updated));
          setHistory(type === 'all' ? updated : updated.filter(item => item.type === type));
          animatedValues.delete(itemKey);
        }
      });
    } catch (error) {
      console.error('Failed to remove history item:', error);
    }
  };

  const clearAllHistory = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      history.forEach((item, index) => {
        const key = `${item.videoUrl}-${item.timestamp}-${index}`;
        Animated.timing(getAnimatedValue(key), { toValue: 0, duration: 300, useNativeDriver: true }).start();
      });
      setTimeout(() => {
        const historyJson = storageService.getItem(StorageKeys.WATCH_HISTORY_KEY);
        if (historyJson) {
          const parsed: WatchHistoryItem[] = JSON.parse(historyJson);
          const updated = type === 'all' ? [] : parsed.filter(item => item.type !== type);
          storageService.setItem(StorageKeys.WATCH_HISTORY_KEY, JSON.stringify(updated));
        }
        setHistory([]);
        animatedValues.clear();
      }, 320);
    } catch (error) {
      console.error('Failed to clear watch history:', error);
    }
  };

  if (isLoading || history.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="play-circle-outline" size={22} color={colors.text} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Continue Watching</Text>
        </View>
        <TouchableOpacity onPress={clearAllHistory} activeOpacity={0.7} style={styles.clearAllButton}>
          <Ionicons name="trash-outline" size={14} color="#ff6b6b" />
          <Text style={styles.clearAllText}>Clear All</Text>
        </TouchableOpacity>
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
            <Animated.View key={itemKey} style={[{ width: CARD_WIDTH }, { opacity: animValue, transform: [{ scale: animValue }] }]}>
              <TouchableOpacity style={styles.card} onPress={() => onItemSelect(item)} activeOpacity={0.8}>
                <View style={[styles.imageContainer, { height: CARD_HEIGHT, backgroundColor: colors.background }]}>
                  <Image source={{ uri: item.artwork }} style={styles.backdrop} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={(e) => { e.stopPropagation(); removeHistoryItem(item, itemKey); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={16} color={colors.text} />
                  </TouchableOpacity>
                  <View style={styles.positionBadge}>
                    <Text
                      style={[styles.positionText, { color: colors.text }]}
                      accessibilityLabel={item.durationSeconds ? `Watched ${formatDuration(item.positionSeconds)} of ${formatDuration(item.durationSeconds)}` : `Watched ${formatDuration(item.positionSeconds)}`}
                    >
                      {item.durationSeconds && Number.isFinite(item.durationSeconds)
                        ? `${formatTimeShort(item.positionSeconds)} / ${formatTimeShort(item.durationSeconds)}`
                        : formatDuration(item.positionSeconds)}
                    </Text>
                  </View>
                </View>
                <View style={styles.infoContainer}>
                  <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View >
  );
};

const styles = StyleSheet.create({
  section: { marginTop: 24, marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '600' },
  clearAllButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(255, 107, 107, 0.12)' },
  clearAllText: { fontSize: 13, fontWeight: '500', color: '#ff6b6b' },
  scrollContent: { marginVertical: 10, paddingHorizontal: 16 },
  card: { backgroundColor: 'transparent', borderRadius: 12 },
  imageContainer: { width: '100%', position: 'relative', borderRadius: 12, overflow: 'hidden' },
  backdrop: { width: '100%', height: '100%' },
  removeButton: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 16, padding: 6 },
  positionBadge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  positionText: { fontSize: 11, fontWeight: '500' },
  infoContainer: { paddingTop: 8, paddingHorizontal: 4 },
  title: { fontSize: 14, fontWeight: '500', marginBottom: 4, lineHeight: 18 },
});

export default WatchHistory;
