import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text } from '@/components/Themed';

const AddonsScreen = () => {
  const [addons, setAddons] = useState<any[]>([]);

  const fetchAddons = async () => {
    try {
      const storedAddons = await AsyncStorage.getItem('addons');
      if (storedAddons) {
        setAddons(JSON.parse(storedAddons));
      }
    } catch (error) {
      console.error('Error fetching addons:', error);
    }
  };

  useEffect(() => {
    fetchAddons();
  }, []);


  const addAddon = async () => {
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
      {/* First Row: Icon and Title */}
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

      {/* Third Row: Actions */}
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
  );


  return (
    <View style={styles.container}>
      <Text style={styles.header}>Manage Addons</Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => addAddon()}
      >
        <Text style={styles.addButtonText}>New Addon</Text>
      </TouchableOpacity>
      <FlatList
        data={addons}
        keyExtractor={(item) => item.id}
        renderItem={renderAddonItem}
        contentContainerStyle={styles.addonsList}
      />      
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
    fontSize: 14,
  },
  addonDescription: {
    fontSize: 14,
    color: '#777',
    marginBottom: 10,
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
    backgroundColor: '#fc7703',
    padding: 12,
    borderRadius: 8,
    width: '60%',
    margin: 'auto'
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center'
  },
});

export default AddonsScreen;
