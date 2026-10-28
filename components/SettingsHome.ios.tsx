import React from 'react';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, FieldGroup, Host, Icon, List, Row, Spacer, Text } from '@expo/ui';
import { Text as AppText, View } from '@/components/Themed';
import { useTheme } from '@/context/ThemeContext';
import { isHapticsSupported } from '@/utils/platform';
import { systemDarkBackground } from '@/constants/theme';

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
    icon: React.ComponentProps<typeof Icon>['name'];
    iconColor: string;
  }[];
}[] = [
    {
      title: 'General',
      items: [
        { title: 'Add-ons', route: '/settings/addons', icon: 'puzzlepiece.extension', iconColor: '#FF9F0A' },
        { title: 'Media Player', route: '/settings/mediaplayer', icon: 'play.rectangle', iconColor: '#30D158' },
      ],
    },
    {
      title: 'Integrations',
      items: [
        { title: 'Stremio', route: '/settings/stremioserver', icon: 'server.rack', iconColor: '#0A84FF' },
        { title: 'OpenSubtitles', route: '/settings/opensubtitles', icon: 'captions.bubble', iconColor: '#BF5AF2' },
      ],
    },
    {
      title: 'Resources',
      items: [{ title: 'Downloads', route: '/settings/downloads', icon: 'arrow.down.circle', iconColor: '#64D2FF' }],
    },
    ...(process.env.EXPO_PUBLIC_SHOW_CONTACT === 'true'
      ? [{
        title: 'About',
        items: [
          { title: 'Contact', route: '/settings/contact' as const, icon: 'envelope' as const, iconColor: '#64D2FF' },
          { title: 'Disclaimer', route: '/settings/disclaimer' as const, icon: 'info.circle' as const, iconColor: '#FFD60A' },
          { title: 'Donate', route: '/settings/donate' as const, icon: 'heart' as const, iconColor: '#FF453A' },
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
    <SafeAreaView style={{ flex: 1, backgroundColor: systemDarkBackground }} edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: 'transparent' }}>
        <AppText style={{ color: colors.text, fontSize: 30, fontWeight: '700', letterSpacing: -0.3 }}>
          Settings
        </AppText>
      </View>
      <Host style={{ flex: 1 }} colorScheme="dark">
        <List>
          {settingsSections.map((section) => (
            <FieldGroup.Section key={section.title} title={section.title}>
              {section.items.map((item) => (
                <Button
                  key={item.route}
                  onPress={() => openSettings(item.route)}
                  variant="text"
                >
                  <Row spacing={12} alignment="center">
                    <Icon name={item.icon} size={20} color={item.iconColor} />
                    <Text>{item.title}</Text>
                    <Spacer flexible />
                    <Icon name="chevron.right" size={13} color="#8e8e93" />
                  </Row>
                </Button>
              ))}
            </FieldGroup.Section>
          ))}
          <FieldGroup.Section title="Strmify">
            <Row>
              <Text>Version</Text>
              <Spacer flexible />
              <Text>{version}</Text>
            </Row>
          </FieldGroup.Section>
        </List>
      </Host>
    </SafeAreaView>
  );
}