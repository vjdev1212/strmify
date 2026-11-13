import React from 'react';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Button, HStack, Host, Image, List, Section, Spacer, Text } from '@expo/ui/swift-ui';
import {
  background,
  contentShape,
  frame,
  listStyle,
  scrollContentBackground,
  scrollIndicators,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import { isHapticsSupported } from '@/utils/platform';
import { useTheme } from '@/context/ThemeContext';
import { settingsIconColors } from '@/constants/theme';

type SettingsRoute =
  | '/settings/addons'
  | '/settings/mediaplayer'
  | '/settings/appearance'
  | '/settings/home'
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
    icon: React.ComponentProps<typeof Image>['systemName'];
    color: string;
  }[];
}[] = [
    {
      title: 'General',
      items: [
        { title: 'Appearance', route: '/settings/appearance', icon: 'circle.lefthalf.filled', color: settingsIconColors.appearance },
        { title: 'Customize Home', route: '/settings/home', icon: 'house', color: settingsIconColors.success },
        { title: 'Add-ons', route: '/settings/addons', icon: 'puzzlepiece.extension', color: settingsIconColors.addOns },
        { title: 'Media Player', route: '/settings/mediaplayer', icon: 'play.rectangle', color: settingsIconColors.mediaPlayer },
      ],
    },
    {
      title: 'Integrations',
      items: [
        { title: 'Stremio', route: '/settings/stremioserver', icon: 'server.rack', color: settingsIconColors.stremio },
        { title: 'OpenSubtitles', route: '/settings/opensubtitles', icon: 'captions.bubble', color: settingsIconColors.subtitles },
      ],
    },
    {
      title: 'Resources',
      items: [{ title: 'Downloads', route: '/settings/downloads', icon: 'arrow.down.circle', color: settingsIconColors.downloads }],
    },
    ...(process.env.EXPO_PUBLIC_SHOW_CONTACT === 'true'
      ? [{
        title: 'About',
        items: [
          { title: 'Contact', route: '/settings/contact' as const, icon: 'envelope' as const, color: settingsIconColors.contact },
          { title: 'Disclaimer', route: '/settings/disclaimer' as const, icon: 'info.circle' as const, color: settingsIconColors.disclaimer },
          { title: 'Donate', route: '/settings/donate' as const, icon: 'heart' as const, color: settingsIconColors.donate },
        ],
      }]
      : []),
  ];

export default function SettingsHome() {
  const router = useRouter();
  const { colorScheme, colors } = useTheme();
  const version = Constants.expoConfig?.version ?? 'Unknown';

  const openSettings = async (route: SettingsRoute) => {
    if (await isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(route);
  };

  return (
    <Host style={{ flex: 1 }} colorScheme={colorScheme}>
      <List modifiers={[
        listStyle('insetGrouped'),
        scrollIndicators('never', 'vertical'),
        scrollContentBackground('hidden'),
        background(colors.background),
      ]}>
        {settingsSections.map((section) => (
          <Section key={section.title} title={section.title}>
            {section.items.map((item) => (
              <Button
                key={item.route}
                onPress={() => openSettings(item.route)}
              >
                <HStack
                  spacing={12}
                  alignment="center"
                  modifiers={[
                    frame({ maxWidth: Infinity }),
                    contentShape(shapes.rectangle()),
                  ]}
                >
                  <Image systemName={item.icon} size={20} color={item.color} />
                  <Text>{item.title}</Text>
                  <Spacer />
                  <Image systemName="chevron.right" size={13} />
                </HStack>
              </Button>
            ))}
          </Section>
        ))}
        <Section title="Strmify">
          <HStack spacing={12} alignment="center">
            <Image systemName="info.circle" size={20} color={settingsIconColors.version} />
            <Text>Version</Text>
            <Spacer />
            <Text>{version}</Text>
          </HStack>
        </Section>
      </List>
    </Host>
  );
}