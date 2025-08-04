import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Pressable,
  Image,
  Alert,
  ScrollView,
  SafeAreaView,
  View,
  Platform,
  Dimensions
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar, Text } from '@/components/Themed';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';

const AddonsScreen = () => {
  const [addons, setAddons] = useState<any[]>([]);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  useEffect(() => {
    const onChange = (result: any) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  const { width, height } = screenData;
  const isTablet = width >= 768;
  const isLandscape = width > height;
  const numColumns = isTablet ? (isLandscape ? 3 : 2) : 1;

  useEffect(() => {
    const fetchAddons = async () => {
      try {
        const storedAddons = await AsyncStorage.getItem('addons');
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
      }
    };

    fetchAddons();
  }, []);

  const removeAddon = async (addonId: string) => {
    const updatedAddons = addons.filter(addon => addon.id !== addonId);
    setAddons(updatedAddons);
    try {
      const updatedAddonsObject = Object.fromEntries(
        updatedAddons.map(addon => [addon.id, addon])
      );
      await AsyncStorage.setItem('addons', JSON.stringify(updatedAddonsObject));
      showAlert('Success', 'Addon removed successfully!');
    } catch (error) {
      showAlert('Error', 'Failed to remove addon.');
    }
  };

  const openConfiguration = async (url: string) => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    try {
      await WebBrowser.openBrowserAsync(`${url}/configure`);
    } catch {
      showAlert('Error', 'Unable to open configuration URL.');
    }
  };

  const shareManifestUrl = async (url: string) => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(url);
      } else {
        showAlert('Error', 'Sharing is not available on this device.');
      }
    } catch {
      showAlert('Error', 'Failed to share the URL.');
    }
  };

  const renderAddonCard = (item: any, index: number) => {
    const configurable = item.behaviorHints?.configurable;
    const cardWidth = numColumns === 1 ? '100%' :
      numColumns === 2 ? '48%' : '31%';

    return (
      <View
        style={[
          styles.addonCard,
          { width: cardWidth },
          numColumns > 1 && styles.multiColumnCard
        ]}
        key={item.id}
      >
        {/* Header Section */}
        <View style={styles.cardHeader}>
          <Image source={{ uri: item.logo }} style={styles.addonLogo} />
          <View style={styles.headerInfo}>
            <Text style={styles.addonName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.addonTypes} numberOfLines={1}>
              {item.types?.join(', ') || 'Unknown'}
            </Text>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.cardBody}>
          <Text style={styles.addonDescription} numberOfLines={5}>
            {item.description}
          </Text>
        </View>

        {/* Actions Section */}
        <View style={styles.cardActions}>
          <Pressable
            style={[styles.actionButton, styles.shareButton]}
            onPress={() => shareManifestUrl(item.manifestUrl)}
          >
            <Ionicons name="share-outline" size={18} color="#ffffff" />
            <Text style={styles.actionButtonText}>Share</Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionButton,
              styles.configureButton,
              !configurable && styles.disabledButton
            ]}
            onPress={() => openConfiguration(item.baseUrl)}
            disabled={!configurable}
          >
            <Ionicons
              name="settings-outline"
              size={18}
              color={configurable ? "#ffffff" : '#666666'}
            />
            <Text style={[
              styles.actionButtonText,
              !configurable && styles.disabledButtonText
            ]}>
              Config
            </Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.removeButton]}
            onPress={async () => {
              if (isHapticsSupported()) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
              }
              const message = `Are you sure you want to remove "${item.name}"?`;
              if (Platform.OS === 'ios' || Platform.OS === 'android') {
                Alert.alert(
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
            <Text style={[styles.actionButtonText, { color: '#ff4757' }]}>
              Remove
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderAddonGrid = () => {
    if (numColumns === 1) {
      return addons.map((item, index) => renderAddonCard(item, index));
    }

    const rows = [];
    for (let i = 0; i < addons.length; i += numColumns) {
      const rowItems = addons.slice(i, i + numColumns);
      rows.push(
        <View key={i} style={styles.gridRow}>
          {rowItems.map((item, index) => renderAddonCard(item, i + index))}
          {/* Fill empty spaces in incomplete rows */}
          {rowItems.length < numColumns &&
            Array(numColumns - rowItems.length).fill(null).map((_, emptyIndex) => (
              <View key={`empty-${i}-${emptyIndex}`} style={{ width: '31%' }} />
            ))
          }
        </View>
      );
    }
    return rows;
  };

  const onAddNewPress = async () => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    router.push('/settings/add');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar />

      {/* Header with Add Button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Addons</Text>
        <Pressable style={styles.addButton} onPress={onAddNewPress}>
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.addButtonText}>Add New</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          addons.length === 0 && styles.emptyContentContainer
        ]}
      >
        {addons.length > 0 ? (
          <View style={styles.addonGrid}>
            {renderAddonGrid()}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="extension-puzzle-outline" size={80} color="#535aff" />
            </View>
            <Text style={styles.emptyStateTitle}>No Addons Yet</Text>
            <Text style={styles.emptyStateText}>
              Get started by adding your first addon to enhance your experience
            </Text>
            <Pressable style={styles.emptyActionButton} onPress={onAddNewPress}>
              <Ionicons name="add-circle-outline" size={20} color="#535aff" />
              <Text style={styles.emptyActionText}>Add Your First Addon</Text>
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
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#535aff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#535aff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyContentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  addonGrid: {
    flex: 1,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  addonCard: {
    backgroundColor: '#101010',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  multiColumnCard: {
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addonLogo: {
    width: 50,
    height: 50,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#1f1f1f',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  addonName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  addonTypes: {
    fontSize: 12,
    color: '#999999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    marginBottom: 16,
  },
  addonDescription: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
    minHeight: 100
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#202020',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8
  },
  shareButton: {
    backgroundColor: '#2a2a2a',
  },
  configureButton: {
    backgroundColor: '#2a2a2a',
  },
  removeButton: {
    backgroundColor: '#2a2a2a',
  },
  disabledButton: {
    backgroundColor: '#1a1a1a',
    borderColor: '#2a2a2a',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
    marginLeft: 4,
  },
  disabledButtonText: {
    color: '#666666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#535aff',
    borderStyle: 'dashed',
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#535aff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyActionText: {
    color: '#535aff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AddonsScreen;