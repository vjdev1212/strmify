import React from 'react';
import { StyleSheet, Pressable, View, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { StatusBar, Text } from '@/components/Themed';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported } from '@/utils/platform';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomSpacing from '@/components/BottomSpacing';
import Constants from 'expo-constants';
import BlurGradientBackground from '@/components/BlurGradientBackground';

const SettingsScreen = () => {
  const router = useRouter();
  const appVersion = Constants.expoConfig?.version;

  const showContact = process.env.EXPO_PUBLIC_SHOW_CONTACT === 'true';

  const integrationList: { title: string, route: string, icon: keyof typeof Ionicons.glyphMap }[] = [
    { title: 'Stremio', route: '/settings/stremioserver', icon: 'magnet-outline' },
    { title: 'OpenSubtitles', route: '/settings/opensubtitles', icon: 'chatbox-ellipses-outline' },
  ];

  const General: { title: string, route: string, icon: keyof typeof Ionicons.glyphMap }[] = [
    { title: 'Addons', route: '/settings/addons', icon: 'extension-puzzle-outline' },
    { title: 'Media Player', route: '/settings/mediaplayer', icon: 'play-circle-outline' },
  ];

  const contactList: { title: string, route: string, icon: keyof typeof Ionicons.glyphMap }[] = [
    { title: 'Contact', route: '/settings/contact', icon: 'mail-outline' },
    { title: 'Disclaimer', route: '/settings/disclaimer', icon: 'information-circle-outline' },
    { title: 'Donate', route: '/settings/donate', icon: 'heart-outline' },
  ];

  const resourcesList: { title: string, route: string, icon: keyof typeof Ionicons.glyphMap }[] = [
    { title: 'Downloads', route: '/settings/downloads', icon: 'download-outline' },
  ];

  const SettingItem = ({
    title,
    icon,
    onPress,
    isFirst = false,
    isLast = false
  }: {
    title: string,
    icon: keyof typeof Ionicons.glyphMap,
    onPress: () => void,
    isFirst?: boolean,
    isLast?: boolean
  }) => {
    const [isPressed, setIsPressed] = React.useState(false);

    return (
      <Pressable
        style={[
          styles.settingItem,
          {
            backgroundColor: isPressed ? '#1a1a1a' : '#101010',
            borderTopLeftRadius: isFirst ? 12 : 0,
            borderTopRightRadius: isFirst ? 12 : 0,
            borderBottomLeftRadius: isLast ? 12 : 0,
            borderBottomRightRadius: isLast ? 12 : 0,
          }
        ]}
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
      >
        <View style={styles.leftContent}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={icon}
              size={22}
              color='#535aff'
            />
          </View>
          <Text style={styles.settingText}>
            {title}
          </Text>
        </View>
        <MaterialIcons
          name="chevron-right"
          size={22}
          color='#6E6E73'
        />
        {!isLast && (
          <View style={styles.separator} />
        )}
      </Pressable>
    );
  };

  const onSettingsItemPress = async (item: any) => {
    if (await isHapticsSupported()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({ pathname: item.route });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar />
      <BlurGradientBackground />
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* General Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>
            GENERAL
          </Text>
          <View style={styles.settingsGroup}>
            {General.map((item, index) => (
              <SettingItem
                key={index}
                title={item.title}
                icon={item.icon}
                onPress={() => onSettingsItemPress(item)}
                isFirst={index === 0}
                isLast={index === General.length - 1}
              />
            ))}
          </View>
        </View>

        {/* Integrations Section */}
        {integrationList.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>
              INTEGRATIONS
            </Text>
            <View style={styles.settingsGroup}>
              {integrationList.map((item, index) => (
                <SettingItem
                  key={index}
                  title={item.title}
                  icon={item.icon}
                  onPress={() => onSettingsItemPress(item)}
                  isFirst={index === 0}
                  isLast={index === integrationList.length - 1}
                />
              ))}
            </View>
          </View>
        )}

        {/* Resources Section */}
        {resourcesList.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>
              RESOURCES
            </Text>
            <View style={styles.settingsGroup}>
              {resourcesList.map((item, index) => (
                <SettingItem
                  key={index}
                  title={item.title}
                  icon={item.icon}
                  onPress={() => onSettingsItemPress(item)}
                  isFirst={index === 0}
                  isLast={index === resourcesList.length - 1}
                />
              ))}
            </View>
          </View>
        )}

        {/* Contact Section */}
        {showContact && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>
              CONTACT
            </Text>
            <View style={styles.settingsGroup}>
              {contactList.map((item, index) => (
                <SettingItem
                  key={index}
                  title={item.title}
                  icon={item.icon}
                  onPress={() => onSettingsItemPress(item)}
                  isFirst={index === 0}
                  isLast={index === contactList.length - 1}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version {appVersion}</Text>
        </View>
        <BottomSpacing space={50} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 40,
    maxWidth: 780,
    margin: 'auto',
    width: '100%',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    color: '#8E8E93',
    marginBottom: 10,
    marginLeft: 20,
    marginRight: 20,
    letterSpacing: 0.5,
  },
  settingsGroup: {
    marginHorizontal: 16,
    overflow: 'hidden',
    borderRadius: 12,
  },
  settingItem: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 52,
    position: 'relative',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  separator: {
    position: 'absolute',
    bottom: 0,
    left: 60,
    right: 16,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2a2a2a',
  },
  versionContainer: {
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  versionText: {
    fontSize: 13,
    color: '#6E6E73',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});

export default SettingsScreen;