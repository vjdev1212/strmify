import React, { useState, useCallback, useRef } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  Pressable,
  Image,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { MenuView, type MenuAction } from '@expo/ui/community/menu';
import { Ionicons } from '@expo/vector-icons';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { View, Text, WebMenu } from '@vjdev1212/media-ui-kit';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { PosterArtwork } from '@vjdev1212/media-ui-kit';
import type { PlaybackSettings } from '@/components/coreplayer/models';

export interface WatchHistoryItem {
  title: string;
  videoUrl: string;
  streamInfoHash?: string;
  streamFileIdx?: number;
  imdbid: string;
  tmdbid?: string;
  type: string;
  season: string;
  episode: string;
  useKsPlayer?: string;
  positionSeconds: number;
  durationSeconds?: number;
  playbackSettings?: PlaybackSettings;
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

const WatchHistory: React.FC<WatchHistoryProps> = ({ onItemSelect, type }) => {
  const { colors, colorScheme } = useTheme();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const animatedValues = useRef<Map<string, Animated.Value>>(new Map()).current;
  const touchStartRef = useRef<{ pageX: number; pageY: number } | null>(null);
  const didScrollRef = useRef(false);
  const longPressRef = useRef(false);
  const longPressResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markLongPress = () => {
    longPressRef.current = true;
    if (longPressResetRef.current) clearTimeout(longPressResetRef.current);
    longPressResetRef.current = setTimeout(() => {
      longPressRef.current = false;
      longPressResetRef.current = null;
    }, 1000);
  };

  const consumeLongPress = () => {
    if (!longPressRef.current) return false;
    longPressRef.current = false;
    if (longPressResetRef.current) clearTimeout(longPressResetRef.current);
    longPressResetRef.current = null;
    return true;
  };

  const POSTER_WIDTH = 88;
  const POSTER_HEIGHT = 132;
  const CARD_SPACING = 12;

  useFocusEffect(useCallback(() => {
    void loadWatchHistory();
  }, [type]));

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
            positionSeconds: Number(p.playbackSettings?.positionSeconds ?? p.positionSeconds),
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

  const handleHistoryMenuAction = useCallback((item: WatchHistoryItem, itemKey: string, actionId: string) => {
    if (actionId === 'continue') {
      onItemSelect(item);
    } else if (actionId === 'details' && item.tmdbid) {
      router.push({
        pathname: item.type === 'series' ? '/series/details' : '/movie/details',
        params: { tmdbid: item.tmdbid },
      });
    } else if (actionId === 'details') {
      router.push({
        pathname: item.type === 'series' ? '/series/details' : '/movie/details',
        params: { tmdbid: item.imdbid },
      });
    } else if (actionId === 'clear') {
      void removeHistoryItem(item, itemKey);
    }
  }, [onItemSelect, removeHistoryItem]);

  if (isLoading || history.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.historyList}>
        {history.map((item, index) => {
          const itemKey = `${item.videoUrl}-${item.timestamp}-${index}`;
          const animValue = getAnimatedValue(itemKey);
          const durationSeconds = Number(item.durationSeconds);
          const watchedSeconds = Math.max(0, Number(item.positionSeconds) || 0);
          const movieTitleMatch = item.type === 'movie'
            ? item.title.match(/^(.*)\s\((\d{4})\)$/)
            : null;
          const displayTitle = movieTitleMatch?.[1] ?? item.title;
          const year = movieTitleMatch?.[2];
          const progressPercentage = Number.isFinite(durationSeconds) && durationSeconds > 0
            ? Math.min(100, Math.max(0, (watchedSeconds / durationSeconds) * 100))
            : 0;
          const menuActions: MenuAction[] = [
            { id: 'continue', title: 'Continue Watching', image: 'play' },
            { id: 'details', title: item.type === 'series' ? 'Go to TV Show' : 'Go to Movie', image: 'arrow.up.right' },
            {
              id: 'clear',
              title: 'Clear',
              image: 'trash',
              imageColor: colors.danger,
              attributes: { destructive: true },
            },
          ];
          return (
            <Animated.View
              key={itemKey}
              style={[
                styles.rowWrapper,
                { opacity: animValue, transform: [{ scale: animValue }] },
              ]}
            >
              <View
                style={[styles.card, styles.historyRow]}
              >
                {Platform.OS === 'web' ? (
                  <Pressable
                    style={styles.mediaButton}
                    onTouchStart={(event) => {
                      touchStartRef.current = {
                        pageX: event.nativeEvent.pageX,
                        pageY: event.nativeEvent.pageY,
                      };
                      didScrollRef.current = false;
                    }}
                    onTouchMove={(event) => {
                      const start = touchStartRef.current;
                      if (!start) return;

                      const { pageX, pageY } = event.nativeEvent;
                      if (Math.abs(pageX - start.pageX) > 10 || Math.abs(pageY - start.pageY) > 10) {
                        didScrollRef.current = true;
                      }
                    }}
                    onLongPress={markLongPress}
                    onPress={() => {
                      if (!consumeLongPress() && !didScrollRef.current) onItemSelect(item);
                    }}
                  >
                    <View style={[styles.imageContainer, { width: POSTER_WIDTH, height: POSTER_HEIGHT, backgroundColor: colors.background }]}>
                      <PosterArtwork key={item.artwork} style={styles.artworkFrame} borderRadius={12}>
                        {(onImageLoad) => (
                          <Image
                            source={{ uri: item.artwork }}
                            onLoad={onImageLoad}
                            resizeMethod="resize"
                            style={styles.backdrop}
                            resizeMode="cover"
                          />
                        )}
                      </PosterArtwork>
                    </View>
                    <View style={styles.infoContainer}>
                      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{displayTitle}</Text>
                      <Text style={[styles.mediaType, { color: colors.textMuted }]}>{item.type === 'series' ? 'TV Show' : 'Movie'}</Text>
                      {year && <Text style={[styles.year, { color: colors.text }]}>{year}</Text>}
                      <View style={styles.progressRow}>
                        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                          <View style={[styles.progressFill, { width: `${progressPercentage}%`, backgroundColor: colors.primary }]} />
                        </View>
                        <Text style={[styles.progressPercentage, { color: colors.textMuted }]}>{Math.round(progressPercentage)}%</Text>
                      </View>
                    </View>
                  </Pressable>
                ) : (
                  <MenuView
                    title={item.title}
                    actions={menuActions}
                    shouldOpenOnLongPress
                    colorScheme={colorScheme}
                    style={styles.mediaMenuTrigger}
                    onPressAction={({ nativeEvent }) => handleHistoryMenuAction(item, itemKey, nativeEvent.event)}
                  >
                    <Pressable
                      style={styles.mediaButton}
                onTouchStart={(event) => {
                  touchStartRef.current = {
                    pageX: event.nativeEvent.pageX,
                    pageY: event.nativeEvent.pageY,
                  };
                  didScrollRef.current = false;
                }}
                onTouchMove={(event) => {
                  const start = touchStartRef.current;
                  if (!start) return;

                  const { pageX, pageY } = event.nativeEvent;
                  if (Math.abs(pageX - start.pageX) > 10 || Math.abs(pageY - start.pageY) > 10) {
                    didScrollRef.current = true;
                  }
                }}
                onLongPress={markLongPress}
                onPress={() => {
                  if (!consumeLongPress() && !didScrollRef.current) onItemSelect(item);
                }}
                    >
                <View style={[styles.imageContainer, { width: POSTER_WIDTH, height: POSTER_HEIGHT, backgroundColor: colors.background }]}>
                  <PosterArtwork key={item.artwork} style={styles.artworkFrame} borderRadius={12}>
                    {(onImageLoad) => (
                      <Image
                        source={{ uri: item.artwork }}
                        onLoad={onImageLoad}
                        resizeMethod="resize"
                        style={styles.backdrop}
                        resizeMode="cover"
                      />
                    )}
                  </PosterArtwork>
                </View>
                  <View style={styles.infoContainer}>
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{displayTitle}</Text>
                    <Text style={[styles.mediaType, { color: colors.textMuted }]}>{item.type === 'series' ? 'TV Show' : 'Movie'}</Text>
                    {year && <Text style={[styles.year, { color: colors.text }]}>{year}</Text>}
                    <View style={styles.progressRow}>
                      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                        <View style={[styles.progressFill, { width: `${progressPercentage}%`, backgroundColor: colors.primary }]} />
                      </View>
                      <Text style={[styles.progressPercentage, { color: colors.textMuted }]}>
                        {Math.round(progressPercentage)}%
                      </Text>
                    </View>
                  </View>
                    </Pressable>
                  </MenuView>
                )}
                <View style={styles.menuActionSlot}>
                  {(() => {
                    const menuButton = (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`More actions for ${item.title}`}
                        hitSlop={10}
                        onPress={(event) => event.stopPropagation()}
                        style={styles.menuButton}
                      >
                        <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
                      </Pressable>
                    );
                    return Platform.OS === 'web' ? (
                      <WebMenu
                        title={item.title}
                        actions={menuActions.map(({ id, title, image }) => ({
                          id: id ?? title,
                          title,
                          icon: image === 'trash' ? 'trash-outline' : image === 'arrow.up.right' ? 'arrow-forward-outline' : 'play-outline',
                          titleColor: id === 'clear' ? colors.danger : undefined,
                          iconColor: id === 'clear' ? colors.danger : undefined,
                        }))}
                        onPressAction={(actionId) => handleHistoryMenuAction(item, itemKey, actionId)}
                      >
                        {menuButton}
                      </WebMenu>
                    ) : (
                      <MenuView title={item.title} actions={menuActions} shouldOpenOnLongPress={false} colorScheme={colorScheme} onPressAction={({ nativeEvent }) => handleHistoryMenuAction(item, itemKey, nativeEvent.event)}>
                        {menuButton}
                      </MenuView>
                    );
                  })()}
                </View>
                <View pointerEvents="none" style={[styles.rowDivider, { backgroundColor: colors.text }]} />
              </View>
            </Animated.View>
          );
        })}
      </View>
    </View >
  );
};

const styles = StyleSheet.create({
  section: { marginTop: 0, marginBottom: 0 },
  rowWrapper: { width: '100%' },
  historyList: { width: '100%', gap: 0 },
  card: { width: '100%', backgroundColor: 'transparent' },
  historyRow: { position: 'relative', flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingHorizontal: 16, paddingVertical: 12 },
  mediaButton: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  mediaMenuTrigger: { flex: 1, minWidth: 0 },
  rowDivider: { position: 'absolute', left: 16, right: 16, bottom: 0, height: StyleSheet.hairlineWidth, opacity: 0.1 },
  imageContainer: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
  artworkFrame: { width: '100%', height: '100%' },
  backdrop: { width: '100%', height: '100%' },
  menuActionSlot: { zIndex: 2, width: 56, minWidth: 56, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4 },
  menuButton: { zIndex: 2, width: 40, minHeight: 48, alignItems: 'center', justifyContent: 'flex-start' },
  infoContainer: { flex: 1, gap: 4, paddingTop: 4, paddingRight: 16 },
  title: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  mediaType: { fontSize: 14, lineHeight: 19 },
  year: { fontSize: 14, lineHeight: 19, opacity: 0.6, fontWeight: '500' },
  progressRow: { width: '85%', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  progressTrack: { height: 4, flex: 1, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressPercentage: { fontSize: 12, fontWeight: '600', minWidth: 32, textAlign: 'right' },
});

export default WatchHistory;
