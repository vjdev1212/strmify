import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  SafeAreaView,
  View,
  Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '@/components/Themed';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';

const AddonsScreen = () => {
  const [addons, setAddons] = useState<any[]>([]);

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
      Alert.alert('Success', 'Addon removed successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to remove addon.');
    }
  };

  const openConfiguration = async (url: string) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await WebBrowser.openBrowserAsync(`${url}/configure`);
    } catch {
      Alert.alert('Error', 'Unable to open configuration URL.');
    }
  };

  const shareManifestUrl = async (url: string) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(url);
      } else {
        Alert.alert('Sharing is not available on this device.');
      }
    } catch {
      Alert.alert('Error', 'Failed to share the URL.');
    }
  };

  const renderAddonItem = (item: any) => (
    <View style={styles.addonItem} key={item.id}>
      <View style={styles.row}>
        <Image source={{ uri: item.logo }} style={styles.addonLogo} />
        <View style={styles.details}>
          <Text style={styles.addonName}>{item.name}</Text>
          <Text style={styles.addonTypes}>{item.types?.join(', ')}</Text>
        </View>
      </View>
      <Text style={styles.addonDescription}>{item.description}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.shareButton]}
          onPress={() => shareManifestUrl(item.manifestUrl)}
        >
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
        {item.behaviorHints?.configurable && (
          <TouchableOpacity
            style={[styles.actionButton, styles.configureButton]}
            onPress={() => openConfiguration(item.url)}
          >
            <Text style={styles.actionText}>Configure</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.removeButton]}
          onPress={async () => {
            if (Platform.OS !== 'web') {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } Alert.alert(
              'Remove Addon',
              `Are you sure you want to remove "${item.name}"?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: () => removeAddon(item.id),
                },
              ]
            )
          }
          }
        >
          <Text style={styles.actionText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const onAddNewPress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/addons/add');
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={onAddNewPress}>
        <Text style={styles.addButtonText}>Add New</Text>
      </TouchableOpacity>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        {addons.length > 0 ? (
          addons.map(renderAddonItem)
        ) : (
          <Text style={styles.emptyText}>No addons available. Add one now!</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 50,
  },
  addButton: {
    backgroundColor: '#535aff',
    borderRadius: 25,
    marginHorizontal: 20,
    marginVertical: 20,
    alignSelf: 'center',
    padding: 12,
    width: '40%',
  },
  addButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    marginTop: 20,
  },
  addonItem: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 20,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  shareButton: {    
    backgroundColor: '#2165da',
  },
  configureButton: {
    backgroundColor: '#7F7FFF',
  },
  removeButton: {
    backgroundColor: '#2fb1cb',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default AddonsScreen;
