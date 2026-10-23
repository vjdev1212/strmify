import React from 'react';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Host } from '@expo/ui';
import { List, Section, Text, Button, HStack, Spacer, Image } from '@expo/ui/swift-ui';
import { buttonStyle, listStyle, scrollContentBackground, background } from '@expo/ui/swift-ui/modifiers';
import { Text as AppText, View } from '@/components/Themed';
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
  items: {
    title: string;
    route: SettingsRoute;
    icon: NonNullable<React.ComponentProps<typeof Image>['systemName']>;
  }[];
}[] = [
  {
    title: 'General',
    items: [
      { title: 'Add-ons', route: '/settings/addons', icon: 'puzzlepiece.extension' },
      { title: 'Media Player', route: '/settings/mediaplayer', icon: 'play.rectangle' },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { title: 'Stremio', route: '/settings/stremioserver', icon: 'server.rack' },
      { title: 'OpenSubtitles', route: '/settings/opensubtitles', icon: 'captions.bubble' },
    ],
  },
  {
    title: 'Resources',
    items: [{ title: 'Downloads', route: '/settings/downloads', icon: 'arrow.down.circle' }],
  },
  ...(process.env.EXPO_PUBLIC_SHOW_CONTACT === 'true'
    ? [{
      title: 'About',
      items: [
        { title: 'Contact', route: '/settings/contact' as const, icon: 'envelope' as const },
        { title: 'Disclaimer', route: '/settings/disclaimer' as const, icon: 'info.circle' as const },
        { title: 'Donate', route: '/settings/donate' as const, icon: 'heart' as const },
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 }}>
        <AppText style={{ color: colors.text, fontSize: 32, fontWeight: '700', letterSpacing: 0.5 }}>
          Settings
        </AppText>
      </View>
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
                    <Image systemName={item.icon} size={20} color="#0a84ff" />
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
    </SafeAreaView>
  );
}
