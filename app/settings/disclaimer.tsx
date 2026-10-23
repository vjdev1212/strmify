import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar, Text } from '@/components/Themed';
import { SettingsPage, SettingsSection } from '@/components/NativeSettings';
import { useTheme } from '@/context/ThemeContext';
import { systemDarkBackground } from '@/constants/theme';

const sections = [
  {
    header: 'Application Purpose',
    text: 'This app is only a dashboard that provides movie and TV show information. All content access is provided through third-party add-ons and external sources that users choose to install and use.',
  },
  {
    header: 'Legal Notice',
    text: 'Users are solely responsible for ensuring their use of any third-party add-ons or external content sources complies with applicable laws and regulations in their jurisdiction, including copyright laws and licensing agreements.',
  },
  {
    header: 'Not Endorsed',
    text: 'The developer does not endorse, encourage, or support:\n• Accessing pirated or illegally distributed content\n• Using torrents for copyrighted material\n• Any activities that violate copyright laws\n• Illegal streaming or downloading of content',
  },
  {
    header: 'Developer Responsibility',
    text: 'The developer of this application:\n• Is not responsible for user actions or content accessed through add-ons\n• Does not provide, control, or moderate third-party content sources\n• Will not be held liable for any legal consequences resulting from user actions\n• Has no control over add-on functionality or content sources',
  },
];

export default function DisclaimerScreen() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: systemDarkBackground }}>
      <StatusBar />
      <SettingsPage hideScrollIndicator>
        <SettingsSection title="About this app" footer="The developer assumes no responsibility for how users choose to use third-party add-ons or external content sources.">
          <Text style={[styles.summary, { color: colors.text }]}>
            Strmify is a dashboard interface for movie and TV show information. It does not host, store, or distribute content.
          </Text>
        </SettingsSection>
        {sections.map((section) => (
          <SettingsSection key={section.header} title={section.header}>
            <Text selectable style={[styles.sectionText, { color: colors.textMuted }]}>
              {section.text}
            </Text>
          </SettingsSection>
        ))}
      </SettingsPage>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    lineHeight: 21,
  },
  sectionText: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    lineHeight: 21,
  },
});
