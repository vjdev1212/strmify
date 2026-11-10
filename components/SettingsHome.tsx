import React from 'react';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { SettingsPage, SettingsRow, SettingsSection } from '@vjdev1212/media-ui-kit';
import { isHapticsSupported } from '@/utils/platform';
import { settingsIconColors } from '@/constants/theme';

type SettingsRoute =
  | '/settings/addons'
  | '/settings/mediaplayer'
  | '/settings/appearance'
  | '/settings/stremioserver'
  | '/settings/opensubtitles'
  | '/settings/downloads'
  | '/settings/contact'
  | '/settings/disclaimer'
  | '/settings/donate';

const settingsSections: {
  title: string;
  items: {
    title: string;
    route: SettingsRoute;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    color: string;
  }[];
}[] = [
  {
    title: 'General',
    items: [
      { title: 'Appearance', route: '/settings/appearance', icon: 'contrast-outline', color: settingsIconColors.appearance },
      { title: 'Add-ons', route: '/settings/addons', icon: 'extension-puzzle-outline', color: settingsIconColors.addOns },
      { title: 'Media Player', route: '/settings/mediaplayer', icon: 'play-circle-outline', color: settingsIconColors.mediaPlayer },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { title: 'Stremio', route: '/settings/stremioserver', icon: 'server-outline', color: settingsIconColors.stremio },
      { title: 'OpenSubtitles', route: '/settings/opensubtitles', icon: 'chatbox-ellipses-outline', color: settingsIconColors.subtitles },
    ],
  },
  {
    title: 'Resources',
    items: [{ title: 'Downloads', route: '/settings/downloads', icon: 'download-outline', color: settingsIconColors.downloads }],
  },
  ...(process.env.EXPO_PUBLIC_SHOW_CONTACT === 'true'
    ? [{
      title: 'About',
      items: [
        { title: 'Contact', route: '/settings/contact' as const, icon: 'mail-outline' as const, color: settingsIconColors.contact },
        { title: 'Disclaimer', route: '/settings/disclaimer' as const, icon: 'information-circle-outline' as const, color: settingsIconColors.disclaimer },
        { title: 'Donate', route: '/settings/donate' as const, icon: 'heart-outline' as const, color: settingsIconColors.donate },
      ],
    }]
    : []),
];

export default function SettingsHome() {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? 'Unknown';

  const openSettings = async (route: SettingsRoute) => {
    if (await isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(route);
  };

  return (
    <SettingsPage hideScrollIndicator>
      {settingsSections.map((section) => (
        <SettingsSection key={section.title} title={section.title}>
          {section.items.map((item, index) => (
            <SettingsRow
              key={item.route}
              title={item.title}
              leading={<Ionicons name={item.icon} size={20} color={item.color} />}
              onPress={() => openSettings(item.route)}
              isLast={index === section.items.length - 1}
            />
          ))}
        </SettingsSection>
      ))}
      <SettingsSection title="Strmify">
        <SettingsRow
          title="Version"
          detail={version}
          leading={<Ionicons name="information-circle-outline" size={20} color={settingsIconColors.version} />}
          isLast
        />
      </SettingsSection>
    </SettingsPage>
  );
}
