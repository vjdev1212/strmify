import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text } from '@/components/Themed';

const AddonsScreen = () => {
  const [addons, setAddons] = useState<any[]>([]);


  const sampleAddon = {
    id: 'com.stremio.torrentio.addon',
    version: '0.0.14',
    name: 'Torrentio',
    description: 'Provides torrent streams from scraped torrent providers.',
    background: 'https://i.ibb.co/VtSfFP9/t8wVwcg.jpg',
    logo: 'https://i.ibb.co/w4BnkC9/GwxAcDV.png',
    configurable: true,
    baseURL: 'https://torrentio.strem.fun',
  };


  const fetchAddons = async () => {
    try {
      const storedAddons = await AsyncStorage.getItem('addons');
      if (storedAddons) {
        setAddons(JSON.parse(storedAddons));
      } else {
        setAddons([sampleAddon]);
      }
    } catch (error) {
      console.error('Error fetching addons:', error);
    }
  };

  useEffect(() => {
    fetchAddons();
  }, []);


  const addAddon = async (addon: any) => {
    const updatedAddons = [...addons, addon];
    setAddons(updatedAddons);
    await AsyncStorage.setItem('addons', JSON.stringify(updatedAddons));
  };


  const removeAddon = async (addonId: string) => {
    const updatedAddons = addons.filter(addon => addon.id !== addonId);
    setAddons(updatedAddons);
    await AsyncStorage.setItem('addons', JSON.stringify(updatedAddons));
  };


  const openConfiguration = (url: string) => {
    WebBrowser.openBrowserAsync(`${url}/configure`);
  };


  const renderAddonItem = ({ item }: { item: any }) => (
    <View style={styles.addonItem}>
      <View style={styles.iconColumn}>
        <Image source={{ uri: item.logo }} style={styles.addonLogo} />
      </View>
      <View style={styles.detailsColumn}>
        <Text style={styles.addonName}>{item.name}</Text>
        <Text style={styles.addonDescription}>{item.description}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.configureButton}
            onPress={() => openConfiguration(item.baseURL)}
          >
            <Text style={styles.actionText}>Configure</Text>
          </TouchableOpacity>
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
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Manage Addons</Text>
      <FlatList
        data={addons}
        keyExtractor={(item) => item.id}
        renderItem={renderAddonItem}
        contentContainerStyle={styles.addonsList}
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => addAddon(sampleAddon)}
      >
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 100,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  addonsList: {
    marginBottom: 20,
  },
  addonItem: {
    borderRadius: 10,
    marginBottom: 15,
    padding: 15,
    flexDirection: 'row',
  },
  iconColumn: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  detailsColumn: {
    flex: 1,
    justifyContent: 'space-between',
  },
  addonLogo: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  addonName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  addonDescription: {
    fontSize: 14,
    color: '#777',
    marginTop: 10,
  },
  actions: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  configureButton: {
    backgroundColor: '#fc7703',
    padding: 10,
    borderRadius: 6,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  removeButton: {
    backgroundColor: '#ff4d4d',
    padding: 10,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  actionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#2e7d32',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddonsScreen;
