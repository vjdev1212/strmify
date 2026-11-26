import React, { useState, useCallback, useRef } from 'react';
import {
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Animated,
  RefreshControl,
  Platform,
} from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { MenuView, type MenuAction } from '@expo/ui/community/menu';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, WebMenu } from '@vjdev1212/media-ui-kit';
import WatchHistory, { WatchHistoryItem } from '@/components/WatchHistory';
import { LibraryItem, libraryService } from '@/utils/LibraryService';
import { BottomSpacing } from '@vjdev1212/media-ui-kit';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { PosterArtwork } from '@vjdev1212/media-ui-kit';
import { spacing, typography } from '@/constants/theme';

type LibrarySection = 'all' | 'continue' | 'watchlists' | 'watched';

const LibraryScreen: React.FC = () => {
  const { colors, colorScheme } = useTheme();
  const [allUnwatched, setAllUnwatched] = useState<LibraryItem[]>([]);
  const [allWatched, setAllWatched] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<LibrarySection>('all');

  const animatedValues = useRef(new Map<string, Animated.Value>()).current;
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
  const CARD_SPACING = 0;

  useFocusEffect(
    useCallback(() => {
      loadLibrary();
    }, [])
  );

  const loadLibrary = async () => {
    try {
      const allItems = await libraryService.getLibrary();
      const latest100 = allItems.slice(0, 100);

      const allUnwatchedItems = latest100.filter(item => !item.watched);
      const allWatchedItems = latest100.filter(item => item.watched);

      setAllUnwatched(allUnwatchedItems);
      setAllWatched(allWatchedItems);
    } catch (error) {
      console.error('Failed to load library:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLibrary();
  };

  const getAnimatedValue = (key: string) => {
    if (!animatedValues.has(key)) {
      animatedValues.set(key, new Animated.Value(1));
    }
    return animatedValues.get(key)!;
  };

  const removeFromLibrary = async (item: LibraryItem, itemKey: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const animValue = getAnimatedValue(itemKey);
      Animated.timing(animValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(async () => {
        await libraryService.removeFromLibrary(item.tmdbid, item.type);
        await loadLibrary();
        animatedValues.delete(itemKey);
      });
    } catch (error) {
      console.error('Failed to remove from library:', error);
    }
  };

  const toggleWatchStatus = async (item: LibraryItem) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await libraryService.toggleWatchStatus(item.tmdbid, item.type);
      await loadLibrary();
    } catch (error) {
      console.error('Failed to toggle watch status:', error);
    }
  };

  const handleLibraryMenuAction = async (item: LibraryItem, itemKey: string, actionId: string) => {
    if (actionId === 'details') {
      router.push({
        pathname: item.type === 'series' ? '/series/details' : '/movie/details',
        params: { tmdbid: item.tmdbid },
      });
    } else if (actionId === 'toggle-watched') {
      await toggleWatchStatus(item);
    } else if (actionId === 'remove') {
      await removeFromLibrary(item, itemKey);
    }
  };

  const handleItemPress = (item: LibraryItem) => {
    router.push({
      pathname: item.type === 'movie' ? '/movie/details' : '/series/details',
      params: { tmdbid: item.tmdbid }
    });
  };

  const handleWatchHistoryItemSelect = (item: WatchHistoryItem) => {
    router.push({
      pathname: '/stream/player',
      params: {
        videoUrl: item.streamInfoHash ? undefined : item.videoUrl,
        streamInfoHash: item.streamInfoHash,
        streamFileIdx: item.streamFileIdx?.toString(),
        title: item.title,
        imdbid: item.imdbid,
        type: item.type,
        season: item.season,
        episode: item.episode,
        useKsPlayer: item.useKsPlayer,
        playbackSettings: JSON.stringify({
          ...item.playbackSettings,
          positionSeconds: item.playbackSettings?.positionSeconds ?? item.positionSeconds
        }),
        artwork: item.artwork
      },
    });
  };

  const renderLibraryItem = (item: LibraryItem, index: number) => {
    const itemKey = `${item.tmdbid}-${item.type}-${index}`;
    const animValue = getAnimatedValue(itemKey);
    const menuActions: MenuAction[] = [
      {
        id: 'details',
        title: item.type === 'series' ? 'Go to TV Show' : 'Go to Movie',
        image: 'arrow.up.right',
      },
      {
        id: 'toggle-watched',
        title: item.watched ? 'Mark as Unwatched' : 'Mark as Watched',
        image: item.watched ? 'eye.slash' : 'eye',
      },
      {
        id: 'remove',
        title: 'Remove',
        image: 'trash',
        imageColor: colors.danger,
        attributes: { destructive: true },
      },
    ];
    const mediaButton = (
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
          if (!consumeLongPress() && !didScrollRef.current) handleItemPress(item);
        }}
      >
        <View style={[styles.imageContainer, { width: POSTER_WIDTH, height: POSTER_HEIGHT, backgroundColor: colors.background }]}>
          <PosterArtwork key={item.backdrop || item.poster} style={styles.artworkFrame} borderRadius={10}>
            {(onImageLoad) => (
              <Image
                source={{ uri: item.backdrop || item.poster }}
                onLoad={onImageLoad}
                resizeMethod="resize"
                style={styles.backdrop}
                resizeMode="cover"
              />
            )}
          </PosterArtwork>
        </View>
        <View style={styles.infoContainer}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
          <Text style={[styles.mediaType, { color: colors.textMuted }]}>{item.type === 'series' ? 'TV Show' : 'Movie'}</Text>
          {item.year && <Text style={[styles.year, { color: colors.text }]}>{item.year}</Text>}
        </View>
      </Pressable>
    );

    return (
      <Animated.View
        style={[
          styles.rowWrapper,
          { opacity: animValue, transform: [{ scale: animValue }] },
        ]}
      >
        <View
          style={styles.libraryRow}
        >
          {Platform.OS === 'web' ? mediaButton : (
            <MenuView
              title={item.title}
              actions={menuActions}
              shouldOpenOnLongPress
              colorScheme={colorScheme}
              style={styles.mediaMenuTrigger}
              onPressAction={({ nativeEvent }) => void handleLibraryMenuAction(item, itemKey, nativeEvent.event)}
            >
              {mediaButton}
            </MenuView>
          )}
          <View style={styles.menuActionSlot}>
            {(() => {
              const menuButton = (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`More actions for ${item.title}`}
                  hitSlop={10}
                  style={styles.menuButton}
                >
                  <Ionicons name="ellipsis-horizontal" size={21} color={colors.text} />
                </Pressable>
              );
              return Platform.OS === 'web' ? (
                <WebMenu
                  title={item.title}
                  actions={menuActions.map(({ id, title, image }) => ({
                    id: id ?? title,
                    title,
                    icon: image === 'trash'
                      ? 'trash-outline'
                      : image === 'arrow.up.right'
                        ? 'arrow-forward-outline'
                        : image === 'eye'
                          ? 'eye-outline'
                          : 'eye-off-outline',
                    titleColor: id === 'remove' ? colors.danger : undefined,
                    iconColor: id === 'remove' ? colors.danger : undefined,
                  }))}
                  onPressAction={(actionId) => void handleLibraryMenuAction(item, itemKey, actionId)}
                >
                  {menuButton}
                </WebMenu>
              ) : (
                <MenuView
                  title={item.title}
                  actions={menuActions}
                  shouldOpenOnLongPress={false}
                  colorScheme={colorScheme}
                  onPressAction={({ nativeEvent }) => void handleLibraryMenuAction(item, itemKey, nativeEvent.event)}
                >
                  {menuButton}
                </MenuView>
              );
            })()}
          </View>
          <View pointerEvents="none" style={[styles.rowDivider, { backgroundColor: colors.text }]} />
        </View>
      </Animated.View>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
        </View>
      );
    }

    const libraryItems = activeSection === 'watchlists'
      ? allUnwatched
      : activeSection === 'watched'
        ? allWatched
        : activeSection === 'all'
          ? [...allUnwatched, ...allWatched]
          : [];
    const isAll = activeSection === 'all';
    const isContinueWatching = activeSection === 'continue';
    const shouldShowHistory = isAll || isContinueWatching;
    const hasItems = isAll || isContinueWatching || libraryItems.length > 0;

    return (
      <View style={styles.librarySections}>
        {shouldShowHistory && <WatchHistory onItemSelect={handleWatchHistoryItemSelect} type="all" />}
        {!hasItems ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="albums-outline" size={80} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {activeSection === 'watchlists' ? 'Your Watchlist is Empty' : 'No Completed Items'}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {activeSection === 'watchlists' ? 'Add movies and TV shows to your library to watch later' : 'Watched items will appear here'}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <View style={{ gap: CARD_SPACING }}>
                {libraryItems.map((item, index) => (
                  <React.Fragment key={`${item.tmdbid}-${item.type}-${index}`}>
                    {renderLibraryItem(item, index)}
                  </React.Fragment>
                ))}
              </View>
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {renderContent()}
        <BottomSpacing space={100} />
      </ScrollView>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="line.3.horizontal.decrease" title="Filter Library">
          <Stack.Toolbar.MenuAction
            isOn={activeSection === 'all'}
            onPress={() => setActiveSection('all')}
          >
            All
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            isOn={activeSection === 'continue'}
            onPress={() => setActiveSection('continue')}
          >
            Continue Watching
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            isOn={activeSection === 'watchlists'}
            onPress={() => setActiveSection('watchlists')}
          >
            Watchlists
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            isOn={activeSection === 'watched'}
            onPress={() => setActiveSection('watched')}
          >
            Completed
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  summary: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  headerSubtitle: { ...typography.caption },
  librarySections: { gap: 0, paddingTop: spacing.lg },
  section: { marginTop: 0, marginBottom: 0 },
  rowWrapper: { width: '100%' },
  libraryRow: { position: 'relative', flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingHorizontal: 16, paddingVertical: 12 },
  mediaButton: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  mediaMenuTrigger: { flex: 1, minWidth: 0 },
  rowDivider: { position: 'absolute', left: 16, right: 16, bottom: 0, height: StyleSheet.hairlineWidth, opacity: 0.1 },
  imageContainer: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
  artworkFrame: { width: '100%', height: '100%' },
  backdrop: { width: '100%', height: '100%' },
  menuActionSlot: { width: 56, minWidth: 56, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4 },
  menuButton: { width: 40, minHeight: 48, alignItems: 'center', justifyContent: 'flex-start' },
  infoContainer: { flex: 1, gap: 4, paddingTop: 4, paddingRight: 16 },
  title: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  mediaType: { fontSize: 14, lineHeight: 19 },
  year: { fontSize: 14, lineHeight: 19, opacity: 0.6, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '500', marginTop: 20, marginBottom: 8 },
  emptyText: { fontSize: 14, opacity: 0.6, textAlign: 'center', lineHeight: 20 },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { fontSize: 16, opacity: 0.6 },
});

export default LibraryScreen;
