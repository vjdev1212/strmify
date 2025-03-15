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
import { LinearGradient } from 'expo-linear-gradient';

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
        <Image source={{ uri: item.logo }} style={[styles.addonLogo, {
          backgroundColor: colorScheme === 'dark' ? '#101010' : '#f0f0f0',
        }]} />
        <View style={styles.details}>
          <Text style={styles.addonName}>{item.name}</Text>
          <Text style={styles.addonTypes}>{item.types?.join(', ')}</Text>
        </View>
      </View>
      <Text style={styles.addonDescription}>{item.description}</Text>
      <View style={styles.actions}>
        <Pressable
          style={[styles.actionButton]}
          onPress={() => shareManifestUrl(item.manifestUrl)}
        >
          <Text style={styles.actionText}>Share</Text>
        </Pressable>
        {item.behaviorHints?.configurable && (
          <Pressable
            style={[styles.actionButton]}
            onPress={() => openConfiguration(item.baseUrl)}
          >
            <Text style={styles.actionText}>Configure</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.actionButton]}
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
              )
            } else {
              const isConfirmed = window.confirm(message);
              if (isConfirmed) {
                removeAddon(item.id);
              }
            }
          }
          }
        >
          <Text style={styles.actionText}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );

  const onAddNewPress = async () => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    router.push('/addons/add');
  }

  return (
    <LinearGradient colors={['#111111', '#222222']} start={[0, 0]} end={[1, 0]} style={{ flex: 1 }}>
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
              <Ionicons style={styles.noAddons} name='extension-puzzle-outline' color="#535aff" size={70} />
              <Text style={[styles.noAddonsText]}>
                No addons available. Add one now!
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView >
    </LinearGradient>
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
  addButton: {
    borderRadius: 25,
    paddingHorizontal: 30,
    marginVertical: 20,
    alignSelf: 'center',
    padding: 12,
    borderColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth
  },
  addButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
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
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 20,
    marginHorizontal: 5,
    margin: 'auto',
    textAlign: 'center',
    borderColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center'
  },
  noAddons: {
    marginTop: 100,
    paddingBottom: 20
  }
});

export default AddonsScreen;
