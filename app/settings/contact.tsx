import React from 'react';
import { Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar, View } from '@vjdev1212/media-ui-kit';
import { SettingsPage, SettingsRow, SettingsSection } from '@vjdev1212/media-ui-kit';
import { showAlert } from '@/utils/platform';
import { useTheme } from '@/context/ThemeContext';
import { settingsIconColors } from '@/constants/theme';

const contactActions = [
  {
    title: 'Report a Bug',
    detail: 'Let us know when something is not working',
    icon: 'bug-outline' as const,
    url: process.env.EXPO_PUBLIC_REPORT_BUG_URL ?? '',
  },
];

export default function ContactScreen() {
  const { colors } = useTheme();

  const openContact = async (url: string) => {
    if (!url) {
      showAlert('Link Unavailable', 'This contact link has not been configured.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Failed to open contact link:', error);
      showAlert('Unable to Open Link', 'Please try again later.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar />
      <SettingsPage>
        {contactActions.map((action, index) => (
          <SettingsSection
            key={action.title}
            title={index === 0 ? 'Contact' : undefined}
            footer={action.detail}
          >
            <SettingsRow
              title={action.title}
              onPress={() => openContact(action.url)}
              isLast
              leading={<Ionicons name={action.icon} size={20} color={settingsIconColors.contact} />}
              trailing={<Ionicons name="open-outline" size={17} color={colors.textDim} />}
            />
          </SettingsSection>
        ))}
      </SettingsPage>
    </View>
  );
}
