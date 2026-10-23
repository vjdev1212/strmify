import React, { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, FieldGroup, Host, RNHostView, Row, Text as NativeText, TextInput, useNativeState } from '@expo/ui';
import { router } from 'expo-router';
import { StatusBar, View } from '@/components/Themed';
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
  const nativeUrl = useNativeState(url);

  useEffect(() => {
    nativeUrl.set(url);
  }, [nativeUrl, url]);

  const addAddon = async (enteredUrl = url) => {
    const manifestUrl = enteredUrl.trim().replace(/^stremio:\/\//i, 'https://');
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
    <View style={{ flex: 1, backgroundColor: systemDarkBackground }}>
      <StatusBar />
      <Host style={{ flex: 1 }} colorScheme="dark" seedColor={colors.primary}>
        <FieldGroup>
          <FieldGroup.Section title="Manifest URL">
            <TextInput
              value={nativeUrl}
              onChangeText={(value) => {
                nativeUrl.set(value);
                setUrl(value);
              }}
              placeholder="https://example.com/manifest.json"
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              onSubmitEditing={(submittedUrl) => void addAddon(submittedUrl)}
              returnKeyType="go"
            />
            <FieldGroup.SectionFooter>
              <NativeText>
                {loading
                  ? 'Adding add-on…'
                  : 'Paste an add-on URL ending in manifest.json. Stremio links are supported.'}
              </NativeText>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
          <FieldGroup.Section>
            <Button
              onPress={addAddon}
              disabled={loading}
              variant="filled"
            >
              <Row alignment="center" spacing={6}>
                <RNHostView matchContents>
                  <MaterialIcons name="add" size={20} color={colors.primary} />
                </RNHostView>
                <NativeText>{loading ? 'Adding add-on…' : 'Add add-on'}</NativeText>
              </Row>
            </Button>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </View>
  );
}
