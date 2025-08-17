import React from 'react';
import { StyleSheet, Pressable, View, ScrollView, Platform } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { StatusBar, Text } from '@/components/Themed';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics'
import { isHapticsSupported } from '@/utils/platform';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';

const SettingsScreen = () => {
  const router = useRouter();

  // Get the environment variables and default to false if not set
  const showContact = process.env.EXPO_PUBLIC_SHOW_CONTACT === 'true';

  // Build servers list conditionally based on flags
  const integrationList: { title: string, route: string, icon: keyof typeof Ionicons.glyphMap }[] = [
    { title: 'Stremio', route: '/settings/stremioserver', icon: 'magnet-outline' },
    { title: 'Trakt', route: '/settings/trakt', icon: 'checkmark-done-circle-outline' }
  ];

  const General: { title: string, route: string, icon: keyof typeof Ionicons.glyphMap }[] = [
    { title: 'Addons', route: '/settings/addons', icon: 'extension-puzzle-outline' },
    // { title: 'Media Player', route: '/settings/mediaplayer', icon: 'play-circle-outline' },
    // { title: 'Sync', route: '/settings/sync', icon: 'sync-outline' },
  ];

  const contactList: { title: string, route: string, icon: keyof typeof Ionicons.glyphMap }[] = [
    { title: 'Feedback', route: '/settings/contact', icon: 'mail-outline' },
    { title: 'Donate', route: '/settings/donate', icon: 'heart-circle-outline' },
  ];

  // SettingItem Component with iOS dark styling
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
    return (
      <Pressable
        style={[
          styles.settingItem,
          {
            backgroundColor: '#101010',
            borderTopLeftRadius: isFirst ? 10 : 0,
            borderTopRightRadius: isFirst ? 10 : 0,
            borderBottomLeftRadius: isLast ? 10 : 0,
            borderBottomRightRadius: isLast ? 10 : 0,
          }
        ]}
        onPress={onPress}
        android_ripple={{ color: '#2C2C2E' }}
      >
        <View style={styles.leftContent}>
          <Ionicons
            name={icon}
            size={20}
            color='#535aff'
            style={styles.icon}
          />
          <Text style={[
            styles.settingText,
            { color: '#FFFFFF' }
          ]}>
            {title}
          </Text>
        </View>
        <MaterialIcons
          name="chevron-right"
          size={20}
          color='#8E8E93'
        />
        {!isLast && (
          <View style={styles.separator} />
        )}
      </Pressable>
    );
  };

  const onSettingsItemPress = async (item: any) => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({ pathname: item.route });
  }

  return (
    <SafeAreaView style={[
      styles.container,
    ]}>
      <StatusBar />
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* General Section */}
        <View style={styles.section}>
          <Text style={[
            styles.sectionHeader,
            { color: '#8E8E93' }
          ]}>
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

        {/* Servers Section - Only render if at least one server is enabled */}
        {integrationList.length > 0 && (
          <View style={styles.section}>
            <Text style={[
              styles.sectionHeader,
              { color: '#8E8E93' }
            ]}>
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

        {/* Contact Section - Only render if showContact is true */}
        {showContact && (
          <View style={styles.section}>
            <Text style={[
              styles.sectionHeader,
              { color: '#8E8E93' }
            ]}>
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 30,
    width: '100%',
    maxWidth: 780,
    margin: 'auto'
  },
  scrollViewContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 35,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '400',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 20,
    marginRight: 20,
  },
  settingsGroup: {
    marginHorizontal: 16,
    // iOS uses subtle shadow for grouped sections
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  settingItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 4, // iOS minimum touch target
    position: 'relative',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    flex: 1,
  },
  icon: {
    marginRight: 12,
    width: 22, // Fixed width for consistent alignment
  },
  separator: {
    position: 'absolute',
    bottom: 0,
    left: 50, // Start separator from where the title begins (icon width + margin + padding)
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(42, 42, 42, 0.5)',
  },
});

export default SettingsScreen;