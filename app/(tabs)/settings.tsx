import React from 'react';
import { StyleSheet, Pressable, View, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons'; // Import icons from Expo
import { StatusBar, Text } from '@/components/Themed'; // Assuming you have a Themed Text component
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics'
import { isHapticsSupported } from '@/utils/platform';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';


const SettingsScreen = () => {
  const router = useRouter();
  
  // Get the environment variables and default to false if not set
  const showContact = process.env.EXPO_PUBLIC_SHOW_CONTACT === 'true';
  const enableStremio = process.env.EXPO_PUBLIC_ENABLE_STREMIO === 'true';
  const enableTorrServer = process.env.EXPO_PUBLIC_ENABLE_TORRSERVER === 'true';

  // Build servers list conditionally based on flags
  const serversList: { title: string, route: string, icon: keyof typeof Ionicons.glyphMap }[] = [];
  
  if (enableStremio) {
    serversList.push({ title: 'Stremio', route: '/settings/stremioserver', icon: 'magnet-outline' });
  }
  
  if (enableTorrServer) {
    serversList.push({ title: 'TorrServer', route: '/settings/torrserver', icon: 'magnet-outline' });
  }

  const General: { title: string, route: string, icon: keyof typeof Ionicons.glyphMap }[] = [
    { title: 'Addons', route: '/settings/addons', icon: 'extension-puzzle-outline' },
    // { title: 'Media Player', route: '/settings/mediaplayer', icon: 'play-circle-outline' },
    // { title: 'Sync', route: '/settings/sync', icon: 'sync-outline' },
  ];

  const contactList: { title: string, route: string, icon: keyof typeof Ionicons.glyphMap }[] = [
    { title: 'Contact', route: '/settings/contact', icon: 'mail-outline' },
    { title: 'Support', route: '/settings/donate', icon: 'cash-outline' },
  ];

  // SettingItem Component
  const SettingItem = ({ title, icon, onPress }: { title: string, icon: keyof typeof Ionicons.glyphMap, onPress: () => void }) => (
    <Pressable style={styles.settingItem} onPress={onPress}>
      <Ionicons name={icon} size={24} color="#ffffff" style={styles.icon} />
      <Text style={styles.settingText}>{title}</Text>
      <MaterialIcons name="chevron-right" size={24} color="#ffffff" style={styles.chevron} />
    </Pressable>
  );

  const onSettingsItemPress = async (item: any) => {
    if (isHapticsSupported()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    router.push({ pathname: item.route });
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar />
      <ScrollView contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.header}>General</Text>
          <View style={[styles.settingsGroup]}>
            {General.map((item, index) => (
              <SettingItem
                key={index}
                title={item.title}
                icon={item.icon}
                onPress={() => onSettingsItemPress(item)}
              />
            ))}
          </View>
        </View>

        {/* Only render the Servers section if at least one server is enabled */}
        {serversList.length > 0 && (
          <View>
            <Text style={styles.header}>Servers</Text>
            <View style={[styles.settingsGroup]}>
              {serversList.map((item, index) => (
                <SettingItem
                  key={index}
                  title={item.title}
                  icon={item.icon}
                  onPress={() => onSettingsItemPress(item)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Only render the Contact section if showContact is true */}
        {showContact && (
          <View>
            <Text style={styles.header}>Contact</Text>
            <View style={[styles.settingsGroup]}>
              {contactList.map((item, index) => (
                <SettingItem
                  key={index}
                  title={item.title}
                  icon={item.icon}
                  onPress={() => onSettingsItemPress(item)}
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
    width: '100%',
    maxWidth: 780,
    margin: 'auto'
  },
  scrollViewContent: {
    marginTop: 20,
    paddingBottom: 20,
  },
  header: {
    fontWeight: 'bold',
    fontSize: 17,
    paddingVertical: 5,
    paddingHorizontal: 20,
    marginTop: 25,
    marginLeft: 25,
  },
  settingsGroup: {
    marginVertical: 10,
    marginHorizontal: 25,
    borderRadius: 12,
  },
  settingItem: {
    flexDirection: 'row',
    paddingVertical: 15,
    marginHorizontal: 5,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    flex: 1,
    width: '100%'
  },
  icon: {
    paddingHorizontal: 10,
  },
  chevron: {
    paddingHorizontal: 5,
  },
});

export default SettingsScreen;