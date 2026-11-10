import React from 'react';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Button, FieldGroup, Host, Icon, Row, Spacer, Text } from '@expo/ui';
import { List } from '@expo/ui/swift-ui';
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
          <FieldGroup.Section key={section.title} title={section.title}>
            {section.items.map((item) => (
              <Button
                key={item.route}
                onPress={() => openSettings(item.route)}
                variant="text"
              >
                <Row
                  spacing={12}
                  alignment="center"
                  modifiers={[
                    frame({ maxWidth: Infinity }),
                    contentShape(shapes.rectangle()),
                  ]}
                >
                  <Icon name={item.icon} size={20} />
                  <Text>{item.title}</Text>
                  <Spacer flexible />
                  <Icon name="chevron.right" size={13} />
                </Row>
              </Button>
            ))}
          </FieldGroup.Section>
        ))}
        <FieldGroup.Section title="Strmify">
          <Row spacing={12} alignment="center">
            <Icon name="info.circle" size={20} />
            <Text>Version</Text>
            <Spacer flexible />
            <Text>{version}</Text>
          </Row>
        </FieldGroup.Section>
      </List>
    </Host>
  );
}