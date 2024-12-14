import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Image, Alert, ScrollView, SafeAreaView, View, Clipboard } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '@/components/Themed';
import { Link } from 'expo-router';
import * as Sharing from 'expo-sharing';

const AddonsScreen = () => {
  const [addons, setAddons] = useState<any[]>([]);

  const fetchAddons = async () => {
    try {
      const storedAddons = await AsyncStorage.getItem('addons');
      if (storedAddons) {
        const parsedAddons = JSON.parse(storedAddons);
        const addonsArray = Object.keys(parsedAddons).map(key => ({
          id: key,
          ...parsedAddons[key],
        }));
        setAddons(addonsArray);
      }
    } catch (error) {
      console.error('Error fetching addons:', error);
    }
  };

  useEffect(() => {
    fetchAddons();
  }, []);

  const removeAddon = async (addonId: string) => {
    const updatedAddons = addons.filter(addon => addon.id !== addonId);
    setAddons(updatedAddons);
    await AsyncStorage.setItem('addons', JSON.stringify(updatedAddons));
  };

  const openConfiguration = (url: string) => {
    WebBrowser.openBrowserAsync(`${url}/configure`);
  };

  const shareManifestUrl = async (url: string) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        if (url && url.startsWith('http')) {
          await Sharing.shareAsync(url);
        } else {
          Alert.alert('Invalid URL', 'The URL provided is invalid.');
        }
      } else {
        Alert.alert('Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Error sharing content:', error);
    }
  };

  const renderAddonItem = (item: any) => (
    <View style={styles.addonItem} key={item.id}>
      <View style={styles.firstRow}>
        <View style={styles.iconColumn}>
          <Image source={{ uri: item.logo }} style={styles.addonLogo} />
        </View>
        <View style={styles.titleColumn}>
          <Text style={styles.addonName}>{item.name}</Text>
          <Text style={styles.addonTypes}>{item.types?.join(', ')}</Text>
        </View>
      </View>

      {/* Second Row: Description */}
      <Text style={styles.addonDescription}>{item.description}</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => shareManifestUrl(item.manifestUrl)}
        >
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
        {item.behaviorHints?.configurable && (
          <TouchableOpacity
            style={styles.configureButton}
            onPress={() => openConfiguration(item.url)}
          >
            <Text style={styles.actionText}>Configure</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => {
            Alert.alert(
              'Remove Addon',
              `Are you sure you want to remove ${item.name}?`,
              [
                { text: 'Cancel' },
                {
                  text: 'Remove',
                  onPress: () => removeAddon(item.id),
                },
              ]
            );
          }}
        >
          <Text style={styles.actionText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.addButton}>
        <Link href={{ pathname: "/addons/add", params: {} }}>
          <Text style={styles.addButtonText}>Add New</Text>
        </Link>
      </TouchableOpacity>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.contentContainer}>
        <View style={styles.addonsList}>
          {addons.map(renderAddonItem)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 10
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  addonsList: {
    marginTop: 10,
    marginBottom: 50,
  },
  addonItem: {
    borderRadius: 10,
    marginBottom: 15,
    paddingVertical: 15,
  },
  firstRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconColumn: {
    marginRight: 15,
  },
  titleColumn: {
    flex: 1,
  },
  addonLogo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    resizeMode: 'contain',
  },
  addonName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  addonTypes: {
    fontSize: 15,
  },
  addonDescription: {
    fontSize: 15,
    marginVertical: 5,
  },
  actions: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shareButton: {
    backgroundColor: '#fc7703',
    padding: 10,
    borderRadius: 4,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  configureButton: {
    backgroundColor: '#32a852',
    padding: 10,
    borderRadius: 4,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  removeButton: {
    backgroundColor: '#ff4d4d',
    padding: 10,
    borderRadius: 4,
    flex: 1,
    alignItems: 'center',
  },
  actionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#fc7703',
    padding: 10,
    borderRadius: 4,
    width: '60%',
    margin: 'auto',
    marginBottom: 10,
    marginTop: 30
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AddonsScreen;
