import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import { FieldGroup, Host, Picker, Switch } from '@expo/ui';
import { MenuView } from '@expo/ui/community/menu';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  LinearTransition,
  measure,
  ReduceMotion,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '@/context/ThemeContext';
import { isHapticsSupported, confirmAction, showAlert } from '@/utils/platform';
import {
  loadHomePreferences,
  saveHomePreferences,
  type HomePreferences,
  type HomeSection,
} from '@/utils/HomeCustomization';

type SectionMediaType = HomeSection['mediaType'];

interface SectionPosition {
  y: number;
  height: number;
}

interface PosterSectionsManagerProps {
  selectedMediaType: SectionMediaType;
  onSelectedMediaTypeChange: (mediaType: SectionMediaType) => void;
  onPreferencesChange: (preferences: HomePreferences) => void;
  onAddDiscoverList: (mediaType: SectionMediaType) => void;
  onEditDiscoverList: (section: HomeSection) => void;
}

interface DraggableSectionRowProps {
  section: HomeSection;
  scrollRef: ReturnType<typeof useAnimatedRef<ScrollView>>;
  scrollOffset: SharedValue<number>;
  rowPositions: SharedValue<Record<string, SectionPosition>>;
  orderIds: SharedValue<string[]>;
  activeDragId: string | null;
  colorScheme: 'light' | 'dark';
  colors: ReturnType<typeof useTheme>['colors'];
  disabled: boolean;
  onToggle: (section: HomeSection, enabled: boolean) => void;
  onDragStart: (id: string) => void;
  onReorderPreview: (id: string, destinationIndex: number) => void;
  onDrop: (id: string, destinationIndex: number, canceled: boolean) => void;
  onMoveByAccessibility: (id: string, offset: -1 | 1) => void;
  onEdit: (section: HomeSection) => void;
  onDelete: (section: HomeSection) => void;
  onLayout: (id: string, event: LayoutChangeEvent) => void;
}

function DraggableSectionRow({
  section,
  scrollRef,
  scrollOffset,
  rowPositions,
  orderIds,
  activeDragId,
  colorScheme,
  colors,
  disabled,
  onToggle,
  onDragStart,
  onReorderPreview,
  onDrop,
  onMoveByAccessibility,
  onEdit,
  onDelete,
  onLayout,
}: DraggableSectionRowProps) {
  const translateY = useSharedValue(0);
  const dragStartScrollOffset = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const destinationIndex = useSharedValue(-1);
  const dragging = useSharedValue(false);

  const gesture = usePanGesture({
    enabled: !disabled,
    activateAfterLongPress: 250,
    onActivate: () => {
      const position = rowPositions.get()[section.id];
      const index = orderIds.get().indexOf(section.id);
      dragStartY.set(position?.y ?? 0);
      destinationIndex.set(index);
      dragStartScrollOffset.set(scrollOffset.get());
      dragging.set(true);
      scheduleOnRN(onDragStart, section.id);
    },
    onUpdate: (event) => {
      const viewport = measure(scrollRef);
      if (viewport) {
        const edgeSize = 64;
        let nextOffset = scrollOffset.get();
        if (event.absoluteY > viewport.pageY + viewport.height - edgeSize) {
          nextOffset += 6;
        } else if (event.absoluteY < viewport.pageY + edgeSize && nextOffset > 0) {
          nextOffset = Math.max(0, nextOffset - 6);
        }

        if (nextOffset !== scrollOffset.get()) {
          scrollOffset.set(nextOffset);
          scrollTo(scrollRef, 0, nextOffset, false);
        }
      }

      const currentPosition = rowPositions.get()[section.id];
      const desiredTop = dragStartY.get()
        + event.translationY
        + scrollOffset.get()
        - dragStartScrollOffset.get();
      const currentTop = currentPosition?.y ?? dragStartY.get();
      translateY.set(desiredTop - currentTop);

      const draggedCenter = desiredTop + (currentPosition?.height ?? 0) / 2;
      const ids = orderIds.get();
      const positions = rowPositions.get();
      let nextDestination = destinationIndex.get();
      let closestDistance = Number.POSITIVE_INFINITY;
      ids.forEach((id, index) => {
        const position = positions[id];
        if (!position) return;
        const distance = Math.abs(position.y + position.height / 2 - draggedCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          nextDestination = index;
        }
      });

      if (nextDestination !== destinationIndex.get()) {
        destinationIndex.set(nextDestination);
        scheduleOnRN(onReorderPreview, section.id, nextDestination);
      }
    },
    onDeactivate: (event) => {
      dragging.set(false);
      scheduleOnRN(onDrop, section.id, destinationIndex.get(), event.canceled);
      translateY.set(0);
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: dragging.get() ? 0.88 : 1,
    transform: [{ translateY: translateY.get() }],
    zIndex: dragging.get() ? 1 : 0,
  }));

  const handleAccessibilityAction = (event: { nativeEvent: { actionName: string } }) => {
    if (event.nativeEvent.actionName === 'moveUp') {
      onMoveByAccessibility(section.id, -1);
    } else if (event.nativeEvent.actionName === 'moveDown') {
      onMoveByAccessibility(section.id, 1);
    }
  };

  return (
    <Animated.View
      onLayout={(event) => onLayout(section.id, event)}
      style={[
        styles.sectionRow,
        {
          backgroundColor: colors.primaryCard,
          borderBottomColor: colors.border,
        },
        animatedStyle,
      ]}
      layout={activeDragId === section.id ? undefined : LinearTransition.springify()
        .duration(400)
        .dampingRatio(0.8)
        .reduceMotion(ReduceMotion.System)}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Reorder ${section.title}`}
          accessibilityHint="Touch and hold, then drag to change its position."
          accessibilityActions={[
            { name: 'moveUp', label: 'Move up' },
            { name: 'moveDown', label: 'Move down' },
          ]}
          onAccessibilityAction={handleAccessibilityAction}
          style={styles.dragHandle}
        >
          <Ionicons name="reorder-three-outline" size={22} color={colors.textMuted} />
        </Animated.View>
      </GestureDetector>

      <Host
        style={styles.sectionSwitchHost}
        matchContents={{ vertical: true }}
        ignoreSafeArea="all"
        colorScheme={colorScheme}
      >
        <Switch
          label={section.title}
          value={section.enabled}
          disabled={disabled}
          onValueChange={(enabled) => onToggle(section, enabled)}
        />
      </Host>

      {section.kind === 'discover' ? (
        <MenuView
          actions={[
            { id: 'edit', title: 'Edit', attributes: { disabled } },
            { id: 'delete', title: 'Delete', attributes: { disabled, destructive: true } },
          ]}
          onPressAction={({ nativeEvent }) => {
            if (nativeEvent.event === 'edit') onEdit(section);
            if (nativeEvent.event === 'delete') void onDelete(section);
          }}
        >
          <View
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Actions for ${section.title}`}
            accessibilityHint="Edit or delete this Discover list."
            style={styles.actionButton}
          >
            <MaterialIcons name="more-vert" size={22} color={colors.textMuted} />
          </View>
        </MenuView>
      ) : null}
    </Animated.View>
  );
}

export default function PosterSectionsManager({
  selectedMediaType,
  onSelectedMediaTypeChange,
  onPreferencesChange,
  onAddDiscoverList,
  onEditDiscoverList,
}: PosterSectionsManagerProps) {
  const { colors, colorScheme } = useTheme();
  const [preferences, setPreferences] = useState<HomePreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewOrder, setPreviewOrder] = useState<HomeSection[] | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const scrollRef = useAnimatedRef<ScrollView>();
  const scrollOffset = useSharedValue(0);
  const rowPositions = useSharedValue<Record<string, SectionPosition>>({});
  const orderIds = useSharedValue<string[]>([]);

  const reloadPreferences = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    try {
      const loadedPreferences = loadHomePreferences();
      setPreviewOrder(null);
      setActiveDragId(null);
      setPreferences(loadedPreferences);
      onPreferencesChange(loadedPreferences);
    } catch (error) {
      console.error('Failed to load home screen preferences:', error);
      setPreferences(null);
      setLoadError('Your saved poster sections could not be read.');
      showAlert('Unable to Load Home Settings', 'Your saved poster sections could not be read.');
    } finally {
      setLoading(false);
    }
  }, [onPreferencesChange]);

  useFocusEffect(useCallback(() => {
    reloadPreferences();
  }, [reloadPreferences]));

  const savePreferences = (nextPreferences: HomePreferences): boolean => {
    try {
      saveHomePreferences(nextPreferences);
      setPreferences(nextPreferences);
      onPreferencesChange(nextPreferences);
      return true;
    } catch (error) {
      console.error('Failed to save home screen preferences:', error);
      showAlert('Unable to Save Home Settings', 'Your changes could not be saved. Please try again.');
      return false;
    }
  };

  const sectionsByMediaType = useMemo(() => ({
    movie: preferences?.sections.filter((section) => section.mediaType === 'movie') ?? [],
    series: preferences?.sections.filter((section) => section.mediaType === 'series') ?? [],
  }), [preferences]);
  const displayedSections = previewOrder ?? sectionsByMediaType[selectedMediaType];

  useEffect(() => {
    orderIds.set(displayedSections.map((section) => section.id));
  }, [displayedSections, orderIds]);

  const commitMediaTypeOrder = useCallback((
    mediaType: SectionMediaType,
    orderedSections: HomeSection[],
  ) => {
    if (!preferences) return;
    let sectionIndex = 0;
    const sections = preferences.sections.map((section) => (
      section.mediaType === mediaType
        ? orderedSections[sectionIndex++]
        : section
    ));
    if (savePreferences({ ...preferences, sections })) {
      if (isHapticsSupported()) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          .catch((error) => console.warn('Failed to provide reorder haptics:', error));
      }
    }
  }, [preferences]);

  const handleReorderPreview = useCallback((id: string, destinationIndex: number) => {
    setPreviewOrder((currentOrder) => {
      const orderedSections = [...(currentOrder ?? sectionsByMediaType[selectedMediaType])];
      const sourceIndex = orderedSections.findIndex((section) => section.id === id);
      if (
        sourceIndex < 0
        || destinationIndex < 0
        || destinationIndex >= orderedSections.length
        || sourceIndex === destinationIndex
      ) return currentOrder;

      const [movedSection] = orderedSections.splice(sourceIndex, 1);
      if (!movedSection) return currentOrder;
      orderedSections.splice(destinationIndex, 0, movedSection);
      return orderedSections;
    });
  }, [sectionsByMediaType, selectedMediaType]);

  const handleDrop = useCallback((id: string, destinationIndex: number, canceled: boolean) => {
    setActiveDragId(null);
    if (canceled || !preferences) {
      setPreviewOrder(null);
      return;
    }

    const section = preferences.sections.find((item) => item.id === id);
    if (!section) {
      setPreviewOrder(null);
      return;
    }

    const mediaSections = preferences.sections.filter((item) => item.mediaType === section.mediaType);
    const sourceIndex = mediaSections.findIndex((item) => item.id === id);
    if (sourceIndex < 0 || destinationIndex < 0 || destinationIndex >= mediaSections.length) {
      setPreviewOrder(null);
      return;
    }

    if (destinationIndex !== sourceIndex) {
      const orderedSections = [...mediaSections];
      const [movedSection] = orderedSections.splice(sourceIndex, 1);
      if (movedSection) {
        orderedSections.splice(destinationIndex, 0, movedSection);
        commitMediaTypeOrder(section.mediaType, orderedSections);
      }
    }
    setPreviewOrder(null);
  }, [commitMediaTypeOrder, preferences]);

  const handleMoveByAccessibility = useCallback((id: string, offset: -1 | 1) => {
    if (!preferences) return;
    const section = preferences.sections.find((item) => item.id === id);
    if (!section) return;

    const mediaSections = preferences.sections.filter((item) => item.mediaType === section.mediaType);
    const sourceIndex = mediaSections.findIndex((item) => item.id === id);
    const destinationIndex = sourceIndex + offset;
    if (sourceIndex < 0 || destinationIndex < 0 || destinationIndex >= mediaSections.length) return;
    const orderedSections = [...mediaSections];
    [orderedSections[sourceIndex], orderedSections[destinationIndex]] = [
      orderedSections[destinationIndex],
      orderedSections[sourceIndex],
    ];
    commitMediaTypeOrder(section.mediaType, orderedSections);
  }, [commitMediaTypeOrder, preferences]);

  const toggleSection = (section: HomeSection, enabled: boolean) => {
    if (!preferences) return;
    savePreferences({
      ...preferences,
      sections: preferences.sections.map((item) => item.id === section.id ? { ...item, enabled } : item),
    });
  };

  const editSection = (section: HomeSection) => {
    onEditDiscoverList(section);
  };

  const deleteSection = async (section: HomeSection) => {
    if (!(await confirmAction('Delete home section', `Delete “${section.title}”?`, 'Delete'))) return;
    if (!preferences) return;
    savePreferences({
      ...preferences,
      sections: preferences.sections.filter((item) => item.id !== section.id),
    });
  };

  const recordRowPosition = useCallback((id: string, event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    rowPositions.set({ ...rowPositions.get(), [id]: { y, height } });
  }, [rowPositions]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.set(event.contentOffset.y);
    },
  });

  const renderPosterListGroup = (sections: HomeSection[]) => (
    <View style={styles.group} key="poster-lists">
      <Text style={[styles.subgroupTitle, { color: colors.text }]}>Poster lists</Text>
      <View style={[styles.groupRows, { borderColor: colors.border }]}>
        {sections.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No poster lists are available.
          </Text>
        ) : sections.map((section) => (
          <DraggableSectionRow
            key={section.id}
            section={section}
            scrollRef={scrollRef}
            scrollOffset={scrollOffset}
            rowPositions={rowPositions}
            orderIds={orderIds}
            activeDragId={activeDragId}
            colorScheme={colorScheme}
            colors={colors}
            disabled={loading}
            onToggle={toggleSection}
            onDragStart={setActiveDragId}
            onReorderPreview={handleReorderPreview}
            onDrop={handleDrop}
            onMoveByAccessibility={handleMoveByAccessibility}
            onEdit={editSection}
            onDelete={deleteSection}
            onLayout={recordRowPosition}
          />
        ))}
      </View>
    </View>
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="automatic"
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.description, { color: colors.textMuted }]}>
          Choose a category, then drag any list to reorder it with both default and custom Discover lists.
        </Text>
        {loading ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Loading poster sections…</Text>
        ) : loadError ? (
          <View style={styles.errorState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{loadError}</Text>
            <Pressable accessibilityRole="button" onPress={reloadPreferences}>
              <Text style={[styles.addButtonText, { color: colors.primary }]}>Retry</Text>
            </Pressable>
          </View>
        ) : preferences ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add List"
              accessibilityHint={`Create a Discover list for ${selectedMediaType === 'movie' ? 'Movies' : 'TV Shows'}.`}
              disabled={loading}
              style={[
                styles.addButton,
                {
                  backgroundColor: colors.primaryCard,
                  borderColor: colors.border,
                  opacity: loading ? 0.5 : 1,
                },
              ]}
              onPress={() => onAddDiscoverList(selectedMediaType)}
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              <Text style={[styles.addButtonText, { color: colors.primary }]}>Add List</Text>
            </Pressable>
            <Host style={styles.categoryFieldHost} colorScheme={colorScheme}>
              <FieldGroup>
                <FieldGroup.Section title="Category">
                  <Picker
                    selectedValue={selectedMediaType}
                    onValueChange={(value) => {
                      if (value === 'movie' || value === 'series') {
                        setPreviewOrder(null);
                        setActiveDragId(null);
                        onSelectedMediaTypeChange(value);
                      }
                    }}
                  >
                    <Picker.Item label="Movies" value="movie" />
                    <Picker.Item label="TV Shows" value="series" />
                  </Picker>
                </FieldGroup.Section>
              </FieldGroup>
            </Host>
            {renderPosterListGroup(displayedSections)}
          </>
        ) : null}
      </Animated.ScrollView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 20,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  group: {
    gap: 8,
  },
  groupTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  categoryFieldHost: {
    width: '100%',
    height: 112,
  },
  subgroupTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  groupRows: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  sectionSwitchHost: {
    flex: 1,
  },
  actionButton: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    padding: 16,
    fontSize: 14,
  },
  errorState: {
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    gap: 8,
    paddingHorizontal: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
