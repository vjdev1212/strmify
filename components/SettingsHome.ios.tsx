import React from 'react';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Host } from '@expo/ui';
import { List, Section, Text, Button, HStack, Spacer, Image } from '@expo/ui/swift-ui';
import { buttonStyle, listStyle, scrollContentBackground, background } from '@expo/ui/swift-ui/modifiers';
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
  const version = Constants.expoConfig?.version ?? 'Unknown';

  const openSettings = async (route: SettingsRoute) => {
    if (await isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(route);
  };

  return (
    <Host style={{ flex: 1 }} colorScheme="dark">
      <List modifiers={[
        listStyle('insetGrouped'),
        scrollContentBackground('hidden'),
        background('#000000'),
      ]}>
        {settingsSections.map((section) => (
          <Section key={section.title} title={section.title}>
            {section.items.map((item) => (
              <Button
                key={item.route}
                onPress={() => openSettings(item.route)}
                modifiers={[buttonStyle('plain')]}
              >
                <HStack spacing={12} alignment="center">
                  <Text>{item.title}</Text>
                  <Spacer />
                  <Image systemName="chevron.right" size={13} color="#8e8e93" />
                </HStack>
              </Button>
            ))}
          </Section>
        ))}
        <Section title="Strmify">
          <HStack>
            <Text>Version</Text>
            <Spacer />
            <Text modifiers={[]}>{version}</Text>
          </HStack>
        </Section>
      </List>
    </Host>
  );
}
