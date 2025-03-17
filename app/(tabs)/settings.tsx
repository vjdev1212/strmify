import React from 'react';
import { StyleSheet, Pressable, View, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons'; // Import icons from Expo
import { StatusBar, Text } from '@/components/Themed'; // Assuming you have a Themed Text component
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics'
import { isHapticsSupported } from '@/utils/platform';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import { LinearGradient } from 'expo-linear-gradient';

const SettingsScreen = () => {
  const router = useRouter();

  const colorScheme = useColorScheme();
  const serversList: { title: string, route: string, icon: keyof typeof Ionicons.glyphMap }[] = [
    { title: 'Stremio Server', route: '/settings/stremioserver', icon: 'server-outline' },
    { title: 'TorrServer', route: '/settings/torrserver', icon: 'server-outline' },
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
    <LinearGradient colors={['#111111', '#999999', '#222222']} start={[0, 0]} end={[1, 1]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <StatusBar />
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
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
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
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
  },
  settingText: {
    fontSize: 15,
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
