import React from 'react';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { View } from '@/components/Themed';
import { SettingsPage, SettingsRow, SettingsSection, SettingsTitle } from '@/components/NativeSettings';
import { useTheme } from '@/context/ThemeContext';
import { isHapticsSupported } from '@/utils/platform';

type SettingsRoute =
  | '/settings/addons'
  | '/settings/mediaplayer'
  | '/settings/theme'
  | '/settings/stremioserver'
  | '/settings/opensubtitles'
  | '/settings/downloads'
  | '/settings/contact'
  | '/settings/disclaimer'
  | '/settings/donate';

const settingsSections: { title: string; items: { title: string; route: SettingsRoute }[] }[] = [
  {
    title: 'General',
    items: [
      { title: 'Add-ons', route: '/settings/addons' },
      { title: 'Media Player', route: '/settings/mediaplayer' },
      { title: 'Appearance', route: '/settings/theme' },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { title: 'Stremio', route: '/settings/stremioserver' },
      { title: 'OpenSubtitles', route: '/settings/opensubtitles' },
    ],
  },
  { title: 'Resources', items: [{ title: 'Downloads', route: '/settings/downloads' }] },
  ...(process.env.EXPO_PUBLIC_SHOW_CONTACT === 'true'
    ? [{
      title: 'About',
      items: [
        { title: 'Contact', route: '/settings/contact' as const },
        { title: 'Disclaimer', route: '/settings/disclaimer' as const },
        { title: 'Donate', route: '/settings/donate' as const },
      ],
    }]
    : []),
];

export default function SettingsHome() {
  const router = useRouter();
  const { colors } = useTheme();
  const version = Constants.expoConfig?.version ?? 'Unknown';

  const openSettings = async (route: SettingsRoute) => {
    if (await isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(route);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SettingsPage>
        <SettingsTitle title="Settings" />
        {settingsSections.map((section) => (
          <SettingsSection key={section.title} title={section.title}>
            {section.items.map((item, index) => (
              <SettingsRow
                key={item.route}
                title={item.title}
                onPress={() => openSettings(item.route)}
                isLast={index === section.items.length - 1}
              />
            ))}
          </SettingsSection>
        ))}
        <SettingsSection title="Strmify">
          <SettingsRow title="Version" detail={version} isLast />
        </SettingsSection>
      </SettingsPage>
    </View>
  );
}
