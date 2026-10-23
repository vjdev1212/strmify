import React, { useCallback, useEffect, useState } from 'react';
import { Image, Platform, Share } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar, View } from '@/components/Themed';
import { SettingsPage, SettingsRow, SettingsSection } from '@/components/NativeSettings';
import { showAlert } from '@/utils/platform';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { useTheme } from '@/context/ThemeContext';

const ADDONS_KEY = StorageKeys.ADDONS_KEY;
const defaultAddonLogo = 'https://i.ibb.co/fSJ42PJ/addon.png';

const AddonsScreen = () => {
  const { colors } = useTheme();
  const [addons, setAddons] = useState<any[]>([]);
  const [updatingAddonId, setUpdatingAddonId] = useState<string | null>(null);

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar />
      <SettingsPage onRefresh={onRefresh}>
        <SettingsSection title="Manage" footer="Add-ons provide the sources used to discover streams.">
          <SettingsRow
            title="Add Add-on"
            detail="Install using a manifest URL"
            onPress={() => router.push('/settings/add')}
            isLast
            leading={<Ionicons name="add-circle-outline" size={20} color={colors.primary} />}
            trailing={<Ionicons name="chevron-forward" size={17} color={colors.textDim} />}
          />
        </SettingsSection>
        {addons.length ? addons.map((addon) => {
          const configurable = Boolean(addon.behaviorHints?.configurable);
          const isUpdating = updatingAddonId === addon.id;
          return (
            <SettingsSection
              key={addon.id}
              title={addon.name || 'Unnamed Add-on'}
              footer={[addon.version ? `Version ${addon.version}` : null, addon.types?.join(' · ')].filter(Boolean).join(' · ')}
            >
              <SettingsRow
                title={addon.name || 'Add-on'}
                detail={addon.description || 'Installed source'}
                leading={
                  <Image
                    source={{ uri: addon.logo || defaultAddonLogo }}
                    style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.primarySurface }}
                  />
                }
              />
              {addon.manifestUrl ? (
                <SettingsRow
                  title={isUpdating ? 'Updating…' : 'Update Add-on'}
                  onPress={() => updateAddonManifest(addon.id, addon.manifestUrl)}
                  disabled={isUpdating}
                  leading={<Ionicons name="refresh-outline" size={20} color={colors.primary} />}
                />
              ) : null}
              {addon.manifestUrl ? (
                <SettingsRow
                  title="Share Manifest URL"
                  onPress={() => shareManifestUrl(addon.manifestUrl)}
                  leading={<Ionicons name="share-outline" size={20} color={colors.primary} />}
                />
              ) : null}
              {configurable ? (
                <SettingsRow
                  title="Configure"
                  onPress={() => openConfiguration(addon.baseUrl)}
                  leading={<Ionicons name="settings-outline" size={20} color={colors.primary} />}
                />
              ) : null}
              <SettingsRow
                title="Remove Add-on"
                onPress={() => confirmRemove(addon)}
                destructive
                isLast
                leading={<Ionicons name="trash-outline" size={20} color="#ff453a" />}
              />
            </SettingsSection>
          );
        }) : (
          <SettingsSection title="Installed Add-ons" footer="Add an add-on to start finding available streams.">
            <SettingsRow
              title="No Add-ons Installed"
              detail="Your installed add-ons will appear here."
              isLast
              leading={<Ionicons name="cube-outline" size={20} color={colors.textMuted} />}
            />
          </SettingsSection>
        )}
      </SettingsPage>
    </View>
  );
};

export default AddonsScreen;
