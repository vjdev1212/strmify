import React from 'react';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from '@/components/Themed';
import { SettingsPage, SettingsRow, SettingsSection } from '@/components/NativeSettings';
import { useTheme } from '@/context/ThemeContext';
import { isHapticsSupported } from '@/utils/platform';

type SettingsRoute =
  | '/settings/addons'
  | '/settings/mediaplayer'
  | '/settings/stremioserver'
  | '/settings/opensubtitles'
  | '/settings/downloads'
  | '/settings/contact'
  | '/settings/disclaimer'
  | '/settings/donate';

const settingsSections: {
  title: string;
  items: { title: string; route: SettingsRoute; icon: React.ComponentProps<typeof Ionicons>['name'] }[];
}[] = [
  {
    title: 'General',
    items: [
      { title: 'Add-ons', route: '/settings/addons', icon: 'extension-puzzle-outline' },
      { title: 'Media Player', route: '/settings/mediaplayer', icon: 'play-circle-outline' },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { title: 'Stremio', route: '/settings/stremioserver', icon: 'server-outline' },
      { title: 'OpenSubtitles', route: '/settings/opensubtitles', icon: 'chatbox-ellipses-outline' },
    ],
  },
  {
    title: 'Resources',
    items: [{ title: 'Downloads', route: '/settings/downloads', icon: 'download-outline' }],
  },
  ...(process.env.EXPO_PUBLIC_SHOW_CONTACT === 'true'
    ? [{
      title: 'About',
      items: [
        { title: 'Contact', route: '/settings/contact' as const, icon: 'mail-outline' as const },
        { title: 'Disclaimer', route: '/settings/disclaimer' as const, icon: 'information-circle-outline' as const },
        { title: 'Donate', route: '/settings/donate' as const, icon: 'heart-outline' as const },
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 }}>
        <Text style={{ color: colors.text, fontSize: 32, fontWeight: '700', letterSpacing: 0.5 }}>
          Settings
        </Text>
      </View>
      <SettingsPage hideScrollIndicator>
        {settingsSections.map((section) => (
          <SettingsSection key={section.title} title={section.title}>
            {section.items.map((item, index) => (
              <SettingsRow
                key={item.route}
                title={item.title}
                leading={<Ionicons name={item.icon} size={20} color={colors.primary} />}
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
    </SafeAreaView>
  );
}
