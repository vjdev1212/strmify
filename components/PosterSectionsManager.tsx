import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, View as RNView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Picker, RNHostView, Switch } from '@expo/ui';
import { MenuView, type MenuAction } from '@expo/ui/community/menu';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SettingsPage, SettingsRow, SettingsSection } from '@vjdev1212/media-ui-kit';
import { settingsIconColors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { confirmAction, isHapticsSupported, showAlert } from '@/utils/platform';
import {
  type HomeMediaType,
  getHomeSectionDisplayTitle,
  loadHomePreferences,
  saveHomePreferences,
  type HomePreferences,
  type HomeSection,
} from '@/utils/HomeCustomization';

interface PosterSectionsManagerProps {
  selectedMediaType: 'movies' | 'series';
  onSelectedMediaTypeChange: (mediaType: 'movies' | 'series') => void;
  onPreferencesChange: (preferences: HomePreferences) => void;
  onAddDiscoverList: (mediaType: HomeMediaType) => void;
  onEditDiscoverList: (section: HomeSection) => void;
}

const sectionActionIcons = {
  moveUp: Platform.OS === 'android' ? require('@/assets/icons/poster-move-up.xml') : 'arrow.up',
  moveDown: Platform.OS === 'android' ? require('@/assets/icons/poster-move-down.xml') : 'arrow.down',
  edit: Platform.OS === 'android' ? require('@/assets/icons/poster-edit.xml') : 'pencil',
  remove: Platform.OS === 'android' ? require('@/assets/icons/addon-remove.xml') : 'trash',
} satisfies Record<string, NonNullable<MenuAction['image']>>;

function getMediaTypeWithoutEnabledAlternative(
  sections: HomeSection[],
  section: HomeSection,
) {
  const mediaTypes = section.mediaType === 'any'
    ? ['movie', 'series'] as const
    : [section.mediaType];
  return mediaTypes.find((mediaType) => !sections.some((item) => (
    item.id !== section.id
    && item.enabled
    && (item.mediaType === mediaType || item.mediaType === 'any')
  )));
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

  const reloadPreferences = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    try {
      const loadedPreferences = loadHomePreferences();
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

  const savePreferences = useCallback((nextPreferences: HomePreferences): boolean => {
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
  }, [onPreferencesChange]);

  const displayedSections = useMemo(() => {
    const sections = preferences?.sections ?? [];
    const mediaType = selectedMediaType === 'movies' ? 'movie' : 'series';
    return sections.filter((section) => section.mediaType === 'any' || section.mediaType === mediaType);
  }, [preferences, selectedMediaType]);

  const commitMediaTypeOrder = useCallback((
    mediaType: HomeSection['mediaType'],
    orderedSections: HomeSection[],
  ) => {
    if (!preferences) return;
    let sectionIndex = 0;
    const sections = preferences.sections.map((section) => (
      section.mediaType === mediaType
        ? orderedSections[sectionIndex++]
        : section
    ));
    if (savePreferences({ ...preferences, sections }) && isHapticsSupported()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        .catch((error) => console.warn('Failed to provide reorder haptics:', error));
    }
  }, [preferences, savePreferences]);

  const moveSection = useCallback((sectionId: string, offset: -1 | 1) => {
    if (!preferences) return;
    const section = preferences.sections.find((item) => item.id === sectionId);
    if (!section) return;
    const selectedType = selectedMediaType === 'movies' ? 'movie' : 'series';
    if (section.mediaType !== 'any' && section.mediaType !== selectedType) return;
    const orderedSections = preferences.sections.filter((item) => item.mediaType === section.mediaType);
    const sourceIndex = orderedSections.findIndex((item) => item.id === sectionId);
    const destinationIndex = sourceIndex + offset;
    if (sourceIndex < 0 || destinationIndex < 0 || destinationIndex >= orderedSections.length) return;

    [orderedSections[sourceIndex], orderedSections[destinationIndex]] = [
      orderedSections[destinationIndex],
      orderedSections[sourceIndex],
    ];
    commitMediaTypeOrder(section.mediaType, orderedSections);
  }, [commitMediaTypeOrder, preferences, selectedMediaType]);

  const toggleSection = useCallback((section: HomeSection, enabled: boolean) => {
    if (!preferences) return;
    if (!enabled) {
      const mediaTypeWithoutAlternative = getMediaTypeWithoutEnabledAlternative(
        preferences.sections,
        section,
      );
      if (mediaTypeWithoutAlternative) {
        const mediaTypeLabel = mediaTypeWithoutAlternative === 'movie' ? 'Movies' : 'Series';
        showAlert(
          'Keep a Catalogue Enabled',
          `At least one ${mediaTypeLabel} or Any catalogue must remain enabled.`,
        );
        return;
      }
    }
    savePreferences({
      ...preferences,
      sections: preferences.sections.map((item) => (
        item.id === section.id ? { ...item, enabled } : item
      )),
    });
  }, [preferences, savePreferences]);

  const removeSection = useCallback(async (section: HomeSection) => {
    if (section.kind !== 'discover') return;
    if (!(await confirmAction('Remove catalogue', `Remove “${section.title}”?`, 'Remove'))) return;
    if (!preferences) return;
    if (section.enabled) {
      const mediaTypeWithoutAlternative = getMediaTypeWithoutEnabledAlternative(
        preferences.sections,
        section,
      );
      if (mediaTypeWithoutAlternative) {
        const mediaTypeLabel = mediaTypeWithoutAlternative === 'movie' ? 'Movies' : 'Series';
        showAlert(
          'Keep a Catalogue Enabled',
          `At least one ${mediaTypeLabel} or Any catalogue must remain enabled.`,
        );
        return;
      }
    }

    savePreferences({
      ...preferences,
      sections: preferences.sections.filter((item) => item.id !== section.id),
    });
  }, [preferences, savePreferences]);

  const handleSectionAction = (actionId: string, section: HomeSection) => {
    if (actionId === 'move-up') moveSection(section.id, -1);
    if (actionId === 'move-down') moveSection(section.id, 1);
    if (actionId === 'edit' && section.kind === 'discover') onEditDiscoverList(section);
    if (actionId === 'remove' && section.kind === 'discover') void removeSection(section);
  };

  const renderActionMenu = (
    section: HomeSection,
    trigger: React.ReactNode,
    accessibilityLabel: string,
    showTriggerWithoutActions = true,
  ) => {
    const displayTitle = getHomeSectionDisplayTitle(section);
    const selectedType = selectedMediaType === 'movies' ? 'movie' : 'series';
    const typeSections = preferences?.sections.filter(
      (item) => item.mediaType === section.mediaType,
    ) ?? [];
    const typeIndex = typeSections.findIndex((item) => item.id === section.id);
    const canReorder = section.mediaType === 'any' || section.mediaType === selectedType;
    const actions: MenuAction[] = [
      ...(canReorder
        ? [
          {
            id: 'move-up',
            title: 'Move Up',
            image: sectionActionIcons.moveUp,
            imageColor: colors.textMuted,
            attributes: { disabled: loading || typeIndex === 0 },
          },
          {
            id: 'move-down',
            title: 'Move Down',
            image: sectionActionIcons.moveDown,
            imageColor: colors.textMuted,
            attributes: { disabled: loading || typeIndex === typeSections.length - 1 },
          },
        ]
        : []),
      ...(section.kind === 'discover'
        ? [
          {
            id: 'edit',
            title: 'Edit',
            image: sectionActionIcons.edit,
            imageColor: settingsIconColors.configure,
            attributes: { disabled: loading },
          },
          {
            id: 'remove',
            title: 'Remove',
            image: sectionActionIcons.remove,
            imageColor: settingsIconColors.danger,
            attributes: { disabled: loading, destructive: true },
          },
        ]
        : []),
    ];

    if (actions.length === 0) {
      return (
        <RNView style={{ padding: 8 }}>
          {showTriggerWithoutActions ? trigger : <RNView style={{ width: 20, height: 20 }} />}
        </RNView>
      );
    }

    return (
      <MenuView
        title={`Actions for ${displayTitle}`}
        actions={actions}
        colorScheme={colorScheme}
        shouldOpenOnLongPress={false}
        onPressAction={({ nativeEvent }) => handleSectionAction(nativeEvent.event, section)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          hitSlop={10}
          style={{ padding: 8 }}
        >
          {trigger}
        </Pressable>
      </MenuView>
    );
  };

  return (
    <SettingsPage>
      <SettingsSection title="Manage Catalogues">
        <SettingsRow
          title="Add Catalogue"
          leading={<MaterialIcons name="add" size={20} color={settingsIconColors.success} />}
          onPress={() => onAddDiscoverList(selectedMediaType === 'movies' ? 'movie' : 'series')}
          isLast
        />
      </SettingsSection>
      {loading ? (
        <SettingsSection title="Catalogues">
          <SettingsRow title="Loading catalogues…" disabled isLast />
        </SettingsSection>
      ) : loadError ? (
        <SettingsSection title="Catalogues">
          <SettingsRow title={loadError} disabled />
          <SettingsRow
            title="Retry"
            leading={<Ionicons name="refresh-outline" size={20} color={colors.primary} />}
            onPress={reloadPreferences}
            isLast
          />
        </SettingsSection>
      ) : preferences ? (
        <>
          <SettingsSection title="Category">
            <SettingsRow
              title="Media Type"
              leading={<Ionicons name="film-outline" size={20} color={settingsIconColors.mediaPlayer} />}
              trailingNative={
                <Picker
                  selectedValue={selectedMediaType}
                  onValueChange={(value) => {
                  if (value === 'movies' || value === 'series') {
                      onSelectedMediaTypeChange(value);
                    }
                  }}
                >
                  <Picker.Item label="Movies" value="movies" />
                  <Picker.Item label="Series" value="series" />
                </Picker>
              }
              isLast
            />
          </SettingsSection>
          <SettingsSection
            title={`Catalogues (${displayedSections.length})`}
            footer="Use each action menu to reorder, edit, or remove catalogues; use the switches to enable or disable them."
          >
            {displayedSections.length === 0 ? (
              <SettingsRow title="No catalogues are available." disabled isLast />
            ) : displayedSections.map((section, index) => {
              const displayTitle = getHomeSectionDisplayTitle(section);
              return (
                <SettingsRow
                  key={section.id}
                  title={displayTitle}
                  accessibilityLabel={displayTitle}
                  leading={
                    renderActionMenu(
                      section,
                      <Ionicons
                        name={section.kind === 'discover' ? 'options-outline' : 'albums-outline'}
                        size={20}
                        color={section.kind === 'discover'
                          ? settingsIconColors.configure
                          : settingsIconColors.mediaPlayer}
                      />,
                      `Actions for ${displayTitle}`,
                    )
                  }
                  trailingNative={
                    <>
                      <RNHostView matchContents>
                        {renderActionMenu(
                          section,
                          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textDim} />,
                          `Actions for ${displayTitle}`,
                          false,
                        )}
                      </RNHostView>
                      <Switch
                        value={section.enabled}
                        disabled={loading}
                        onValueChange={(enabled) => toggleSection(section, enabled)}
                      />
                    </>
                  }
                  isLast={index === displayedSections.length - 1}
                />
              );
            })}
          </SettingsSection>
        </>
      ) : null}
    </SettingsPage>
  );
}
