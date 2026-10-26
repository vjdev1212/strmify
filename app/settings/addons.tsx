import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, Share } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { MenuView, type MenuAction } from '@expo/ui/community/menu';
import { StatusBar, View } from '@/components/Themed';
import { SettingsPage, SettingsRow, SettingsSection } from '@/components/NativeSettings';
import { WebMenu } from '@/components/WebMenuView';
import { showAlert } from '@/utils/platform';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { useTheme } from '@/context/ThemeContext';
import { systemDarkBackground } from '@/constants/theme';

const ADDONS_KEY = StorageKeys.ADDONS_KEY;
const defaultAddonLogo = 'https://i.ibb.co/fSJ42PJ/addon.png';
const addonMenuActions: MenuAction[] = [
  { id: 'update', title: 'Check for updates' },
  { id: 'share', title: 'Share install link' },
  { id: 'configure', title: 'Open add-on settings' },
  { id: 'remove', title: 'Remove add-on', attributes: { destructive: true } },
];

const AddonsScreen = () => {
  const { colors } = useTheme();
  const [addons, setAddons] = useState<any[]>([]);
  const [updatingAddonId, setUpdatingAddonId] = useState<string | null>(null);
  const [expandedAddonId, setExpandedAddonId] = useState<string | null>(null);

  const fetchAddons = useCallback(async () => {
    try {
      const storedAddons = storageService.getItem(ADDONS_KEY);
      if (storedAddons) {
        const parsed = JSON.parse(storedAddons);
        setAddons(Object.keys(parsed).map((key) => ({ id: key, ...parsed[key] })));
      } else {
        setAddons([]);
      }
    } catch (error) {
      console.error('Failed to load add-ons:', error);
      showAlert('Error', 'Failed to load add-ons.');
    }
  }, []);

  const onRefresh = async () => fetchAddons();

  useEffect(() => {
    void fetchAddons();
  }, [fetchAddons]);

  const getBaseUrl = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      return `${parsedUrl.protocol}//${parsedUrl.host}`;
    } catch {
      return '';
    }
  };

  const updateAddonManifest = async (addonId: string, manifestUrl: string) => {
    setUpdatingAddonId(addonId);
    try {
      const response = await fetch(manifestUrl);
      if (!response.ok) throw new Error(`Failed to fetch add-on: ${response.status}`);
      const manifestData = await response.json();
      const updatedAddon = {
        ...manifestData,
        id: addonId,
        manifestUrl,
        baseUrl: getBaseUrl(manifestUrl),
        streamBaseUrl: manifestUrl.replace('/manifest.json', ''),
        logo: manifestData?.logo?.match(/\.(png|jpg|jpeg)$/i) ? manifestData.logo : defaultAddonLogo,
      };
      const storedAddons = storageService.getItem(ADDONS_KEY);
      const addonsObject = storedAddons ? JSON.parse(storedAddons) : {};
      addonsObject[addonId] = updatedAddon;
      storageService.setItem(ADDONS_KEY, JSON.stringify(addonsObject));
      await fetchAddons();
      showAlert('Success', `${manifestData.name || 'Add-on'} updated successfully.`);
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : 'Failed to update add-on manifest.');
    } finally {
      setUpdatingAddonId(null);
    }
  };

  const removeAddon = async (addonId: string) => {
    const updatedAddons = addons.filter((addon) => addon.id !== addonId);
    setAddons(updatedAddons);
    try {
      if (updatedAddons.length === 0) {
        storageService.removeItem(ADDONS_KEY);
      } else {
        storageService.setItem(ADDONS_KEY, JSON.stringify(Object.fromEntries(updatedAddons.map((addon) => [addon.id, addon]))));
      }
      showAlert('Success', 'Add-on removed successfully.');
    } catch (error) {
      console.error('Failed to remove add-on:', error);
      showAlert('Error', 'Failed to remove add-on.');
      await fetchAddons();
    }
  };

  const openConfiguration = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(`${url}/configure`);
    } catch (error) {
      console.error('Unable to open add-on configuration:', error);
      showAlert('Error', 'Unable to open configuration URL.');
    }
  };

  const shareManifestUrl = async (url: string) => {
    try {
      await Share.share({ message: url, url });
    } catch (error) {
      console.error('Failed to share add-on URL:', error);
      showAlert('Error', 'Failed to share the URL.');
    }
  };

  const confirmRemove = (addon: any) => {
    const message = `Remove "${addon.name}"?`;
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      showAlert('Remove Add-on', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeAddon(addon.id) },
      ]);
    } else if (window.confirm(message)) {
      void removeAddon(addon.id);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: systemDarkBackground }}>
      <StatusBar />
      <SettingsPage onRefresh={onRefresh}>
        <SettingsSection title="Manage add-ons">
          <SettingsRow
            title="Add new Addon"
            leading={<MaterialIcons name="add" size={20} color="#30d158" />}
            onPress={() => router.push('/settings/add')}
            isLast
          />
        </SettingsSection>
        {addons.length > 0 ? (
          <SettingsSection title={`Installed add-ons (${addons.length})`}>
            {addons.flatMap((addon) => {
              const isUpdating = updatingAddonId === addon.id;
              const isExpanded = expandedAddonId === addon.id;
              const availableActions = addonMenuActions.filter((action) => {
                if ((action.id === 'update' || action.id === 'share') && !addon.manifestUrl) return false;
                if (action.id === 'configure' && !addon.behaviorHints?.configurable) return false;
                return true;
              });
              const handleAction = (actionId: string) => {
                if (actionId === 'update' && addon.manifestUrl && !isUpdating) {
                  void updateAddonManifest(addon.id, addon.manifestUrl);
                } else if (actionId === 'share' && addon.manifestUrl) {
                  void shareManifestUrl(addon.manifestUrl);
                } else if (actionId === 'configure' && addon.baseUrl) {
                  void openConfiguration(addon.baseUrl);
                } else if (actionId === 'remove') {
                  confirmRemove(addon);
                }
              };
              const menuTrigger = (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Actions for ${addon.name || 'add-on'}`}
                  hitSlop={10}
                  onPress={Platform.OS === 'web' ? (event) => event.stopPropagation() : undefined}
                  style={{ padding: 8 }}
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color={colors.textDim} />
                </Pressable>
              );
              const actionButton = Platform.OS === 'web' ? (
                <WebMenu
                  title={addon.name || 'Add-on actions'}
                  actions={availableActions.map(({ id, title }) => ({ id: id ?? title, title }))}
                  onPressAction={handleAction}
                >
                  {menuTrigger}
                </WebMenu>
              ) : (
                <MenuView
                  title={addon.name || 'Add-on actions'}
                  actions={availableActions}
                  onPressAction={({ nativeEvent }) => handleAction(nativeEvent.event)}
                  colorScheme="dark"
                  shouldOpenOnLongPress={false}
                >
                  {menuTrigger}
                </MenuView>
              );
              const categories = addon.types?.join(' · ');

              return [
                <SettingsRow
                  key={`${addon.id}-summary`}
                  title={`${addon.name || 'Unnamed add-on'}${addon.version ? ` · ${addon.version}` : ''}`}
                  onPress={() => setExpandedAddonId(isExpanded ? null : addon.id)}
                  accessibilityLabel={`${isExpanded ? 'Hide' : 'Show'} details for ${addon.name || 'add-on'}`}
                  trailing={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {actionButton}
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.textDim}
                      />
                    </View>
                  }
                />,
                isExpanded ? (
                  <SettingsRow
                    key={`${addon.id}-details`}
                    title={addon.description || 'No description available.'}
                    detail={categories || undefined}
                    detailColor="#8e8e93"
                    isLast
                  />
                ) : null,
              ];
            })}
          </SettingsSection>
        ) : (
          <SettingsSection footer="No add-ons yet. Add-ons you install will appear here.">
            {null}
          </SettingsSection>
        )}
      </SettingsPage>
    </View>
  );
};

export default AddonsScreen;
