import React from 'react';
import { Platform, StyleSheet, Pressable, View } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons'; // Import icons from Expo
import { Text } from '@/components/Themed'; // Assuming you have a Themed Text component
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics'

const SettingsScreen = () => {
  const router = useRouter();
  const serversList = [
    { title: 'Stremio Server', route: '/settings/stremioserver', icon: 'cloud-outline' },
    { title: 'TorrServer', route: '/settings/torrserver', icon: 'cloud-outline' },
  ];

  const contactList = [
    { title: 'Contact', route: '/settings/contact', icon: 'mail-outline' },
    { title: 'Donation', route: '/settings/donate', icon: 'cash-outline' },
  ];

  // SettingItem Component
  const SettingItem = ({ title, icon, onPress }: { title: string, icon: string, onPress: () => void }) => (
    <Pressable style={styles.settingItem} onPress={onPress}>
      <Ionicons name={icon} size={24} color="#535aff" style={styles.icon} />
      <Text style={styles.settingText}>{title}</Text>
      <MaterialIcons name="chevron-right" size={24} color="#535aff" style={styles.chevron} />
    </Pressable>
  );

  const onSettingsItemPress = async (item: any) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    router.push({ pathname: item.route });
  }

  return (
    <View style={styles.container}>
      {/* Servers Group */}
      <View style={styles.settingsGroup}>
        <Text style={styles.header}>Servers</Text>
        {serversList.map((item, index) => (
          <SettingItem
            key={index}
            title={item.title}
            icon={item.icon}
            onPress={() => onSettingsItemPress(item)}
          />
        ))}
      </View>

      <View style={styles.settingsGroup}>
        <Text style={styles.header}>Contact</Text>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
  },
  header: {
    fontSize: 18,
    paddingVertical: 5,
    paddingHorizontal: 20,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  settingsGroup: {
    marginVertical: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    marginHorizontal: 20,
    justifyContent: 'space-between',
  },
  settingText: {
    fontSize: 15,
    flex: 1,
  },
  icon: {
    paddingHorizontal: 10,
  },
  chevron: {
    paddingHorizontal: 5,
  },
});

export default SettingsScreen;
