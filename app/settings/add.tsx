import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { NativeTextInput, NativeButton } from '@/components/native-ui-controls';
import { StatusBar, View } from '@/components/Themed';
import { SettingsPage, SettingsSection } from '@/components/NativeSettings';
import { useTheme } from '@/context/ThemeContext';
import { systemDarkBackground } from '@/constants/theme';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { showAlert } from '@/utils/platform';

const ADDONS_KEY = StorageKeys.ADDONS_KEY;
const defaultAddonLogo = 'https://i.ibb.co/fSJ42PJ/addon.png';

export default function AddAddonScreen() {
  const { colors } = useTheme();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const addAddon = async () => {
    const manifestUrl = url.trim().replace(/^stremio:\/\//i, 'https://');
    if (!manifestUrl) {
      showAlert('Manifest URL required', 'Enter the add-on manifest URL to continue.');
      return;
    }
    if (!manifestUrl.toLowerCase().endsWith('manifest.json')) {
      showAlert('Invalid manifest URL', 'The URL must end in manifest.json.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(manifestUrl);
      if (!response.ok) throw new Error(`Failed to fetch add-on: ${response.status}`);
      const manifestData = await response.json();
      if (!manifestData?.id) throw new Error('The manifest does not include an add-on ID.');
      const parsedUrl = new URL(manifestUrl);
      const storedAddons = storageService.getItem(ADDONS_KEY);
      const addons = storedAddons ? JSON.parse(storedAddons) : {};
      const addon = {
        ...manifestData,
        manifestUrl,
        baseUrl: `${parsedUrl.protocol}//${parsedUrl.host}`,
        streamBaseUrl: manifestUrl.replace('/manifest.json', ''),
        logo: manifestData?.logo?.match(/\.(png|jpg|jpeg)$/i) ? manifestData.logo : defaultAddonLogo,
      };

      storageService.setItem(ADDONS_KEY, JSON.stringify({ ...addons, [addon.id]: addon }));
      showAlert('Success', 'Add-on added successfully.');
      router.navigate({ pathname: '/settings/addons' });
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : 'Failed to add the add-on.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: systemDarkBackground }]}>
      <StatusBar />
      <SettingsPage>
        <SettingsSection
          title="Manifest URL"
          footer={loading
            ? 'Adding add-on…'
            : 'Paste the add-on URL ending in manifest.json. Stremio links are supported.'}
        >
          <View style={styles.inputContent}>
            <NativeTextInput
              style={{ width: '100%' }}
              inputStyle={{
                width: '100%',
                paddingVertical: 12,
                paddingHorizontal: 14,
                backgroundColor: colors.primarySurface,
              }}
              textStyle={{ color: colors.text, fontSize: 16 }}
              seedColor={colors.primary}
              accessibilityLabel="Manifest URL"
              placeholder="https://example.com/manifest.json"
              placeholderTextColor={colors.textDim}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              keyboardType="url"
              onSubmitEditing={addAddon}
              returnKeyType="go"
            />
          </View>
          <NativeButton
            label="Add Addon"
            onPress={addAddon}
            disabled={loading}
            seedColor={colors.primary}
          />
        </SettingsSection>
      </SettingsPage>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inputContent: { padding: 12 },
});
