import React from 'react';
import { Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar, View } from '@/components/Themed';
import { SettingsPage, SettingsRow, SettingsSection } from '@/components/NativeSettings';
import { showAlert } from '@/utils/platform';
import { useTheme } from '@/context/ThemeContext';
import { systemDarkBackground } from '@/constants/theme';

const contactActions = [
  {
    title: 'Feedback',
    detail: 'Share a suggestion or general feedback',
    icon: 'chatbubble-ellipses-outline' as const,
    url: process.env.EXPO_PUBLIC_FEEDBACK_URL ?? '',
  },
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
    <View style={{ flex: 1, backgroundColor: systemDarkBackground }}>
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
              leading={<Ionicons name={action.icon} size={20} color={colors.primary} />}
              trailing={<Ionicons name="open-outline" size={17} color={colors.textDim} />}
            />
          </SettingsSection>
        ))}
      </SettingsPage>
    </View>
  );
}
