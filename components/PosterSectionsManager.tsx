import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable } from 'react-native';
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
  loadHomePreferences,
  saveHomePreferences,
  type HomePreferences,
  type HomeSection,
} from '@/utils/HomeCustomization';

type SectionMediaType = HomeSection['mediaType'];

interface PosterSectionsManagerProps {
  selectedMediaType: SectionMediaType;
  onSelectedMediaTypeChange: (mediaType: SectionMediaType) => void;
  onPreferencesChange: (preferences: HomePreferences) => void;
  onAddDiscoverList: (mediaType: SectionMediaType) => void;
  onEditDiscoverList: (section: HomeSection) => void;
}

const sectionActionIcons = {
  moveUp: Platform.OS === 'android' ? require('@/assets/icons/poster-move-up.xml') : 'arrow.up',
  moveDown: Platform.OS === 'android' ? require('@/assets/icons/poster-move-down.xml') : 'arrow.down',
  edit: Platform.OS === 'android' ? require('@/assets/icons/poster-edit.xml') : 'pencil',
  remove: Platform.OS === 'android' ? require('@/assets/icons/addon-remove.xml') : 'trash',
} satisfies Record<string, NonNullable<MenuAction['image']>>;

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

  const displayedSections = useMemo(
    () => preferences?.sections.filter((section) => section.mediaType === selectedMediaType) ?? [],
    [preferences, selectedMediaType],
  );

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
    if (savePreferences({ ...preferences, sections }) && isHapticsSupported()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        .catch((error) => console.warn('Failed to provide reorder haptics:', error));
    }
  }, [preferences, savePreferences]);

  const moveSection = useCallback((sectionId: string, offset: -1 | 1) => {
    const section = preferences?.sections.find((item) => item.id === sectionId);
    if (!section || !preferences) return;

    const orderedSections = preferences.sections.filter(
      (item) => item.mediaType === section.mediaType,
    );
    const sourceIndex = orderedSections.findIndex((item) => item.id === sectionId);
    const destinationIndex = sourceIndex + offset;
    if (sourceIndex < 0 || destinationIndex < 0 || destinationIndex >= orderedSections.length) return;

    [orderedSections[sourceIndex], orderedSections[destinationIndex]] = [
      orderedSections[destinationIndex],
      orderedSections[sourceIndex],
    ];
    commitMediaTypeOrder(section.mediaType, orderedSections);
  }, [commitMediaTypeOrder, preferences]);

  const toggleSection = useCallback((section: HomeSection, enabled: boolean) => {
    if (!preferences) return;
    savePreferences({
      ...preferences,
      sections: preferences.sections.map((item) => (
        item.id === section.id ? { ...item, enabled } : item
      )),
    });
  }, [preferences, savePreferences]);

  const removeSection = useCallback(async (section: HomeSection) => {
    if (section.kind !== 'discover') return;
    if (!(await confirmAction('Remove poster list', `Remove “${section.title}”?`, 'Remove'))) return;
    if (!preferences) return;

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

  const renderActionMenu = (section: HomeSection, index: number) => {
    const actions: MenuAction[] = [
      {
        id: 'move-up',
        title: 'Move Up',
        image: sectionActionIcons.moveUp,
        imageColor: colors.textMuted,
        attributes: { disabled: loading || index === 0 },
      },
      {
        id: 'move-down',
        title: 'Move Down',
        image: sectionActionIcons.moveDown,
        imageColor: colors.textMuted,
        attributes: { disabled: loading || index === displayedSections.length - 1 },
      },
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

    return (
      <RNHostView matchContents>
        <MenuView
          title={`Actions for ${section.title}`}
          actions={actions}
          colorScheme={colorScheme}
          shouldOpenOnLongPress={false}
          onPressAction={({ nativeEvent }) => handleSectionAction(nativeEvent.event, section)}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Actions for ${section.title}`}
            hitSlop={10}
            style={{ padding: 8 }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textDim} />
          </Pressable>
        </MenuView>
      </RNHostView>
    );
  };

  return (
    <SettingsPage>
      {loading ? (
        <SettingsSection title="Poster Lists">
          <SettingsRow title="Loading poster lists…" disabled isLast />
        </SettingsSection>
      ) : loadError ? (
        <SettingsSection title="Poster Lists">
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
          <SettingsSection title="Manage Lists">
            <SettingsRow
              title="Add List"
              leading={<MaterialIcons name="add" size={20} color={settingsIconColors.success} />}
              onPress={() => onAddDiscoverList(selectedMediaType)}
              isLast
            />
          </SettingsSection>
          <SettingsSection title="Category">
            <SettingsRow
              title="Media Type"
              trailingNative={
                <Picker
                  selectedValue={selectedMediaType}
                  onValueChange={(value) => {
                    if (value === 'movie' || value === 'series') {
                      onSelectedMediaTypeChange(value);
                    }
                  }}
                >
                  <Picker.Item label="Movies" value="movie" />
                  <Picker.Item label="TV Shows" value="series" />
                </Picker>
              }
              isLast
            />
          </SettingsSection>
          <SettingsSection
            title={`Poster Lists (${displayedSections.length})`}
            footer="Use each list’s action menu to move it, edit it, or remove it."
          >
            {displayedSections.length === 0 ? (
              <SettingsRow title="No poster lists are available." disabled isLast />
            ) : displayedSections.map((section, index) => (
              <SettingsRow
                key={section.id}
                title={section.title}
                leading={
                  <Ionicons
                    name={section.kind === 'discover' ? 'options-outline' : 'albums-outline'}
                    size={20}
                    color={section.kind === 'discover'
                      ? settingsIconColors.configure
                      : settingsIconColors.mediaPlayer}
                  />
                }
                trailingNative={
                  <>
                    {renderActionMenu(section, index)}
                    <Switch
                      value={section.enabled}
                      disabled={loading}
                      onValueChange={(enabled) => toggleSection(section, enabled)}
                    />
                  </>
                }
                isLast={index === displayedSections.length - 1}
              />
            ))}
          </SettingsSection>
        </>
      ) : null}
    </SettingsPage>
  );
}
