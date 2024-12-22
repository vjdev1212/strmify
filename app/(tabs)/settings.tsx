import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons'; // Import icons from Expo
import { useNavigation } from '@react-navigation/native';
import { Text } from '@/components/Themed'; // Assuming you have a Themed Text component
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics'

const SettingsScreen = () => {
  const navigation = useNavigation();

  // List of settings for Servers and Contact
  const serversList = [
    { title: 'Stremio Server', route: '/settings/stremio-server', icon: 'film-outline' },
    { title: 'TorrServer', route: '/settings/torrserver', icon: 'film-outline' },
  ];

  const contactList = [
    { title: 'Contact', route: '/settings/contact', icon: 'mail-outline' },
    { title: 'Donation', route: '/settings/donate', icon: 'cash-outline' },
  ];

  // SettingItem Component
  const SettingItem = ({ title, icon, onPress }: { title: string, icon: string, onPress: () => void }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <Ionicons name={icon} size={24} color="#535aff" style={styles.icon} />
      <Text style={styles.settingText}>{title}</Text>
      <MaterialIcons name="chevron-right" size={24} color="#535aff" style={styles.chevron} />
    </TouchableOpacity>
  );

  const onSettingsItemPress = async (item: any) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    marginBottom: 5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'gray',
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
