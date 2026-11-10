import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar, View } from '@vjdev1212/media-ui-kit';
import { SettingsPage, SettingsRow, SettingsSection } from '@vjdev1212/media-ui-kit';
import { settingsActionBlue, settingsIconColors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { showAlert } from '@/utils/platform';
import {
  getUserInterfaceStyle,
  setUserInterfaceStyle,
  type UserInterfaceStyle,
} from '@/utils/UserInterfaceStyle';

const appearanceOptions: {
  value: UserInterfaceStyle;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
}[] = [
  { value: 'automatic', title: 'Automatic', icon: 'phone-portrait-outline', iconColor: settingsIconColors.appearance },
  { value: 'light', title: 'Light', icon: 'sunny-outline', iconColor: settingsIconColors.warning },
  { value: 'dark', title: 'Dark', icon: 'moon-outline', iconColor: settingsIconColors.mediaPlayer },
];

export default function AppearanceSettingsScreen() {
  const { colors } = useTheme();
  const [selectedStyle, setSelectedStyle] = useState(getUserInterfaceStyle);

  const selectStyle = (style: UserInterfaceStyle) => {
    try {
      setUserInterfaceStyle(style);
      setSelectedStyle(style);
    } catch (error) {
      console.error('Failed to save appearance preference:', error);
      showAlert('Unable to Save Appearance', 'Your appearance preference could not be saved. Please try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar />
      <SettingsPage>
        <SettingsSection footer="Automatic follows your device’s appearance setting.">
          {appearanceOptions.map((option, index) => {
            const selected = selectedStyle === option.value;
            return (
              <SettingsRow
                key={option.value}
                title={option.title}
                leading={<Ionicons name={option.icon} size={20} color={option.iconColor} />}
                trailing={selected ? <Ionicons name="checkmark-circle" size={20} color={settingsActionBlue} /> : null}
                onPress={() => selectStyle(option.value)}
                selected={selected}
                isLast={index === appearanceOptions.length - 1}
              />
            );
          })}
        </SettingsSection>
      </SettingsPage>
    </View>
  );
}
