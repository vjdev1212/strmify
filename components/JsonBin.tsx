import React, { useState, useEffect } from 'react';
import { StyleSheet, TextInput, Pressable, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text } from '@/components/Themed';
import { showAlert } from '@/utils/platform';

const JsonBinConfigScreen = () => {
  const jsonBinApiKey = 'JSONBIN_API_KEY';
  const [masterKey, setMasterKey] = useState<string>('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const apiKey = await AsyncStorage.getItem(jsonBinApiKey);
        setMasterKey(apiKey || '');
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!masterKey.trim()) {
      showAlert('Error', 'Please enter a valid X-Master-Key.');
      return;
    }

    try {
      await AsyncStorage.setItem(jsonBinApiKey, masterKey);
      showAlert('Success', `JsonBin configurations saved.`);
    } catch (error) {
      showAlert('Error', 'Failed to save configuration.');
      console.error('Error saving settings:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{`JsonBin Configuration`}</Text>
      <View style={styles.configContainer}>
        <View style={styles.configGroup}>
          <Text style={styles.configGroupHeader}>JsonBin Settings</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter X-Master-Key"
            value={masterKey}
            onChangeText={setMasterKey}
            autoCapitalize="none"
            placeholderTextColor={'#777777'}
          />
          <Pressable onPress={handleSave}>
            <Text style={styles.saveBtn}>Save</Text>
          </Pressable>
        </View>

        <View style={styles.configDetails}>
          <Text style={styles.configLabel}>X-Master-Key:</Text>
          <Text style={styles.configValue}>{masterKey}</Text>
        </View>
        <View>
          <Text style={styles.configHelpText}>
            We recommend using JsonBin to store user configurations, such as add-ons, server settings, and other preferences. This ensures seamless syncing across devices while keeping your data in your control.{"\n\n"}
            Please visit{' '}
            <Text style={{ color: '#535aff' }} onPress={() => Linking.openURL('https://jsonbin.io')}>
              https://jsonbin.io
            </Text>{' '}
            create an account if you haven't already, navigate to API Keys, copy your X-Master-Key, and paster it below.</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    fontSize: 16,
    borderRadius: 12,
    padding: 10,
    paddingLeft: 20,
    marginVertical: 30,
    color: '#ffffff',
    backgroundColor: '#111111'
  },
  saveBtn: {
    marginTop: 10,
    textAlign: 'center',
    paddingVertical: 12,
    borderRadius: 25,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    width: '50%',
    marginHorizontal: '25%',
    backgroundColor: '#535aff'
  },
  configDetails: {
    marginHorizontal: 10,
    marginVertical: 10,
  },
  configLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingBottom: 10,
  },
  configValue: {
    fontSize: 15,
    paddingBottom: 10,
  },
  configContainer: {
    marginVertical: 10,
  },
  configGroup: {
    marginBottom: 20,
  },
  configGroupHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    marginHorizontal: 15
  },
  configHelpText: {
    fontSize: 14,
    color: '#f0f0f0',
    paddingHorizontal: 10
  }
});

export default JsonBinConfigScreen;
