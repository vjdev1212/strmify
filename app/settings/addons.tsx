import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Pressable,
  Image,
  Alert,
  ScrollView,
  SafeAreaView,
  View,
  Platform
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

  const colorScheme = useColorScheme();
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
    } try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(url);
      } else {
        showAlert('Error', 'Sharing is not available on this device.');
      }
    } catch {
      showAlert('Error', 'Failed to share the URL.');
    }
  };

  const renderAddonItem = (item: any) => (
    <View style={styles.addonItem} key={item.id}>
      <View style={styles.row}>
        <View style={styles.addonItemContainer}>
          <View style={styles.row}>
            <Image source={{ uri: item.logo }} style={[styles.addonLogo]} />
            <View style={styles.details}>
              <Text style={styles.addonName}>{item.name}</Text>
              <Text style={styles.addonTypes}>{item.types?.join(', ')}</Text>
            </View>
          </View>
          <Text style={styles.addonDescription}>{item.description}</Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, styles.shareButton]}
            onPress={() => shareManifestUrl(item.manifestUrl)}
          >
            <Ionicons name="share-outline" size={22} color="white" />
          </Pressable>

          {item.behaviorHints?.configurable && (
            <Pressable
              style={[styles.actionButton, styles.configureButton]}
              onPress={() => openConfiguration(item.baseUrl)}
            >
              <Ionicons name="settings-outline" size={22} color="white" />
            </Pressable>
          )}

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
            <Ionicons name="trash-outline" size={22} color="white" />
          </Pressable>
        </View>
      </View>
    </View>
  );


  const onAddNewPress = async () => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    router.push('/settings/add');
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar />
      <Pressable style={styles.addButton} onPress={onAddNewPress}>
        <Text style={styles.addButtonText}>Add New</Text>
      </Pressable>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        {addons.length > 0 ? (
          addons.map(renderAddonItem)
        ) : (
          <View style={styles.centeredContainer}>
            <Ionicons style={styles.noAddons} name='extension-puzzle-outline' color="#ffffff" size={70} />
            <Text style={[styles.noAddonsText]}>
              No addons available. Add one now!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 780,
    margin: 'auto',
    marginTop: 20,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 50,
  },
  addonItemContainer: {
    width: '80%'
  },
  addButton: {
    borderRadius: 25,
    paddingHorizontal: 30,
    marginVertical: 20,
    alignSelf: 'center',
    padding: 12,
    backgroundColor: '#535aff'
  },
  addButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16
  },
  noAddonsText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
  addonItem: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 15
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  addonLogo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    resizeMode: 'contain',
    marginRight: 15,
  },
  details: {
    flex: 1,
  },
  addonName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addonTypes: {
    fontSize: 14,
  },
  addonDescription: {
    fontSize: 14,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'column',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginVertical: 10,
    borderRadius: 50,
    marginHorizontal: 20,
    textAlign: 'center',
    backgroundColor: '#222222',
    justifyContent: 'space-around'
  },
  shareButton: {
  },
  configureButton: {
  },
  removeButton: {
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center'
  },
  noAddons: {
    marginTop: 100,
    paddingBottom: 20
  }
});

export default AddonsScreen;
