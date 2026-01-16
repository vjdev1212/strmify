import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Pressable,
  Image,
  Alert,
  ScrollView,
  View,
  Platform,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Share
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar, Text } from '@/components/Themed';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StorageKeys, storageService } from '@/utils/StorageService';

const ADDONS_KEY = StorageKeys.ADDONS_KEY;
const defaultAddonLogo = 'https://i.ibb.co/fSJ42PJ/addon.png';

const AddonsScreen = () => {
  const [addons, setAddons] = useState<any[]>([]);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [refreshing, setRefreshing] = useState(false);
  const [updatingAddonId, setUpdatingAddonId] = useState<string | null>(null);

  useEffect(() => {
    const onChange = (result: any) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  const fetchAddons = async () => {
    try {
      const storedAddons = storageService.getItem(ADDONS_KEY);
      if (storedAddons) {
        const parsedAddons = JSON.parse(storedAddons);
        setAddons(
          Object.keys(parsedAddons).map(key => ({
            id: key,
            ...parsedAddons[key],
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching addons:', error);
      showAlert('Error', 'Failed to load addons from secure storage.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAddons();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAddons();
  }, []);

  const getBaseUrl = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      return `${parsedUrl.protocol}//${parsedUrl.host}`;
    } catch (error) {
      return '';
    }
  };

  const updateAddonManifest = async (addonId: string, manifestUrl: string) => {
    setUpdatingAddonId(addonId);

    try {
      const response = await fetch(manifestUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const manifestData = await response.json();

      const updatedAddon = {
        ...manifestData,
        id: addonId,
        manifestUrl: manifestUrl,
        baseUrl: getBaseUrl(manifestUrl),
        streamBaseUrl: manifestUrl.replace('/manifest.json', ''),
        logo: manifestData?.logo?.match(/\.(png|jpg|jpeg)$/i)
          ? manifestData.logo
          : defaultAddonLogo,
      };

      const storedAddons = storageService.getItem(ADDONS_KEY);
      const addonsObject = storedAddons ? JSON.parse(storedAddons) : {};

      addonsObject[addonId] = updatedAddon;

      storageService.setItem(ADDONS_KEY, JSON.stringify(addonsObject));

      await fetchAddons();

      showAlert('Success', `${manifestData.name || 'Addon'} updated successfully!`);
    } catch (error: any) {
      console.error('Error updating addon:', error);
      showAlert('Error', error.message || 'Failed to update addon manifest');
    } finally {
      setUpdatingAddonId(null);
    }
  };

  const removeAddon = async (addonId: string) => {
    const updatedAddons = addons.filter(addon => addon.id !== addonId);
    setAddons(updatedAddons);
    try {
      const updatedAddonsObject = Object.fromEntries(
        updatedAddons.map(addon => [addon.id, addon])
      );

      if (updatedAddons.length === 0) {
        storageService.removeItem(ADDONS_KEY);
      } else {
        storageService.setItem(ADDONS_KEY, JSON.stringify(updatedAddonsObject));
      }

      showAlert('Success', 'Addon removed successfully!');
    } catch (error) {
      console.error('Error removing addon:', error);
      showAlert('Error', 'Failed to remove addon from secure storage.');
      await fetchAddons();
    }
  };

  const openConfiguration = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(`${url}/configure`);
    } catch {
      showAlert('Error', 'Unable to open configuration URL.');
    }
  };

  const shareManifestUrl = async (url: string) => {
    try {
      await Share.share({
        message: url,
        url: url,
      });
    } catch (error: any) {
      console.error('Failed to share url', error)
      showAlert('Error', 'Failed to share the URL.');
    }
  };

  const AddonLogo = ({ uri, style }: { uri: string; style: any }) => {
    return <Image source={{ uri }} style={style} />;
  };

  const renderAddonCard = (item: any, index: number) => {
    const configurable = item.behaviorHints?.configurable;
    const hasManifestUrl = !!item.manifestUrl;
    const isUpdating = updatingAddonId === item.id;

    return (
      <View style={styles.addonCard} key={item.id}>
        <View style={styles.cardHeader}>
          <AddonLogo uri={item.logo} style={styles.addonLogo} />
          <View style={styles.headerInfo}>
            <Text style={styles.addonName} numberOfLines={2}>{item.name}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.addonTypes} numberOfLines={1}>
                {item.types?.join(' · ') || 'Unknown'}
              </Text>
              {item.version && (
                <View style={styles.versionBadge}>
                  <Text style={styles.versionText}>v{item.version}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {item.description && (
          <View style={styles.cardBody}>
            <Text style={styles.addonDescription} numberOfLines={3}>
              {item.description}
            </Text>
          </View>
        )}

        <View style={styles.cardActions}>
          {hasManifestUrl && (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.actionButtonPressed
              ]}
              onPress={() => updateAddonManifest(item.id, item.manifestUrl)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="refresh" size={18} color="#ffffff" />
              )}
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed
            ]}
            onPress={() => shareManifestUrl(item.manifestUrl)}
          >
            <Ionicons name="share-outline" size={18} color="#ffffff" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              !configurable && styles.disabledButton,
              pressed && configurable && styles.actionButtonPressed
            ]}
            onPress={() => openConfiguration(item.baseUrl)}
            disabled={!configurable}
          >
            <Ionicons
              name="settings-outline"
              size={18}
              color={configurable ? "#ffffff" : '#555555'}
            />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.removeButton,
              pressed && styles.removeButtonPressed
            ]}
            onPress={async () => {
              const message = `Remove "${item.name}"?`;
              if (Platform.OS === 'ios' || Platform.OS === 'android') {
                showAlert(
                  'Remove Addon',
                  message,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove',
                      style: 'destructive',
                      onPress: () => removeAddon(item.id),
                    },
                  ]
                );
              } else {
                const isConfirmed = window.confirm(message);
                if (isConfirmed) {
                  removeAddon(item.id);
                }
              }
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#ff4757" />
          </Pressable>
        </View>
      </View>
    );
  };

  const onAddNewPress = async () => {
    router.push('/settings/add');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Addons</Text>
        <Pressable 
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed
          ]} 
          onPress={onAddNewPress}
        >
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          addons.length === 0 && styles.emptyContentContainer
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#535aff"
            colors={['#535aff']}
            progressBackgroundColor="#1a1a1a"
          />
        }
      >
        {addons.length > 0 ? (
          <View style={styles.addonList}>
            {addons.map((item, index) => renderAddonCard(item, index))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="cube-outline" size={48} color="#535aff" />
            </View>
            <Text style={styles.emptyStateTitle}>No Addons</Text>
            <Text style={styles.emptyStateText}>
              Get started by adding your first addon
            </Text>
            <Pressable 
              style={({ pressed }) => [
                styles.emptyActionButton,
                pressed && styles.emptyActionButtonPressed
              ]} 
              onPress={onAddNewPress}
            >
              <Ionicons name="add-circle-outline" size={20} color="#535aff" />
              <Text style={styles.emptyActionText}>Add Addon</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 30,
    width: '100%',
    maxWidth: 700,
    margin: 'auto'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#535aff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addButtonPressed: {
    opacity: 0.7,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  emptyContentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  addonList: {
    flex: 1,
    gap: 16,
  },
  addonCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addonLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    marginRight: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  addonName: {
    fontSize: 17,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addonTypes: {
    fontSize: 13,
    color: '#888888',
    fontWeight: '500',
  },
  versionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#aaaaaa',
  },
  cardBody: {
    marginBottom: 14,
  },
  addonDescription: {
    fontSize: 14,
    color: '#aaaaaa',
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionButtonPressed: {
    opacity: 0.6,
  },
  removeButton: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
  },
  removeButtonPressed: {
    opacity: 0.6,
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(83, 90, 255, 0.1)',
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(83, 90, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#535aff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  emptyActionButtonPressed: {
    opacity: 0.7,
  },
  emptyActionText: {
    color: '#535aff',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
});

export default AddonsScreen;