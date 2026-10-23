import React from 'react';
import { Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar, View } from '@/components/Themed';
import { SettingsPage, SettingsRow, SettingsSection } from '@/components/NativeSettings';
import { showAlert } from '@/utils/platform';
import { useTheme } from '@/context/ThemeContext';

export default function DonateScreen() {
  const { colors } = useTheme();

  const openDonationPage = async () => {
    const username = process.env.EXPO_PUBLIC_BUY_ME_COFFEE ?? '';
    try {
      await Linking.openURL(`https://www.buymeacoffee.com/${username}`);
    } catch (error) {
      console.error('Failed to open donation page:', error);
      showAlert('Unable to Open Link', 'The donation page could not be opened.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar />
      <SettingsPage>
        <SettingsSection title="Support" footer="Contributions help keep this project maintained and improving.">
          <SettingsRow
            title="Buy Me a Coffee"
            detail="Open the support page in your browser"
            onPress={openDonationPage}
            isLast
            leading={<Ionicons name="cafe-outline" size={20} color={colors.primary} />}
            trailing={<Ionicons name="open-outline" size={17} color={colors.textDim} />}
          />
        </SettingsSection>
      </SettingsPage>
    </View>
  );
}
