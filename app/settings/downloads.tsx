import React from 'react';
import { Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar, View } from '@/components/Themed';
import { SettingsPage, SettingsRow, SettingsSection } from '@/components/NativeSettings';
import { showAlert } from '@/utils/platform';
import { useTheme } from '@/context/ThemeContext';
import { systemDarkBackground } from '@/constants/theme';

const resources = [
  { title: 'Google Play Store', detail: 'Download for Android devices', icon: 'logo-google-playstore' as const, iconColor: '#34A853', url: 'https://play.google.com/store/apps/details?id=com.vijayyuvi.strmify' },
  { title: 'Manual IPA Install', detail: 'Direct download for sideloading', icon: 'logo-apple' as const, iconColor: '#FFFFFF', url: 'https://github.com/vjdev1212/strmify/releases' },
  { title: 'SideStore Source', detail: 'Install through SideStore', icon: 'cloud-download-outline' as const, iconColor: '#5E5CE6', url: 'sidestore://source?url=https://raw.githubusercontent.com/vjdev1212/strmify/refs/heads/main/sources/sidestore-source.json' },
  { title: 'AltStore Source', detail: 'Install through AltStore', icon: 'cloud-download-outline' as const, iconColor: '#0A84FF', url: 'altstore://source?url=https://raw.githubusercontent.com/vjdev1212/strmify/refs/heads/main/sources/sidestore-source.json' },
];

export default function DownloadsScreen() {
  const { colors } = useTheme();

  const openResource = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening download resource:', error);
      showAlert('Unable to Open Link', 'The selected download link could not be opened on this device.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: systemDarkBackground }}>
      <StatusBar />
      <SettingsPage>
        {resources.map((resource, index) => (
          <SettingsSection
            key={resource.title}
            title={index === 0 ? 'Install Strmify' : undefined}
            footer={`${index === 0 ? 'Choose a source to install or update Strmify. ' : ''}${resource.detail}.`}
          >
            <SettingsRow
              title={resource.title}
              onPress={() => openResource(resource.url)}
              isLast
              leading={<Ionicons name={resource.icon} size={20} color={resource.iconColor} />}
              trailing={<Ionicons name="open-outline" size={17} color={colors.textDim} />}
            />
          </SettingsSection>
        ))}
      </SettingsPage>
    </View>
  );
}
