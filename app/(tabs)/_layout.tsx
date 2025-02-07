import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/components/useColorScheme';
import { Platform } from 'react-native';
import { isHapticsSupported } from '@/utils/platform';
import { Ionicons } from '@expo/vector-icons';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

function TabBarIconIonIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const isWeb = Platform.OS === 'web';
  const colorScheme = isWeb ? 'dark' : useColorScheme();

  const getTabBarHeight = () => {
    switch (Platform.OS) {
      case 'web':
        return 70;
      case 'ios':
        return 85;
      default:
        return 65;
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#535aff',
        headerShown: false,
        tabBarStyle: { height: getTabBarHeight() },
      }}
    >
      <Tabs.Screen
        name="index"
        listeners={{
          tabPress: () => {
            if (isHapticsSupported()) {
              Haptics.selectionAsync();
            }
          },
        }}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          tabBarIconStyle: { marginVertical: 5 }
        }}
      />
      <Tabs.Screen
        name="search"
        listeners={{
          tabPress: () => {
            if (isHapticsSupported()) {
              Haptics.selectionAsync();
            }
          },
        }}
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <TabBarIcon name="search" color={color} />,
          tabBarIconStyle: { marginVertical: 5 },
        }}
      />
      <Tabs.Screen
        name="addons"
        listeners={{
          tabPress: () => {
            if (isHapticsSupported()) {
              Haptics.selectionAsync();
            }
          },
        }}
        options={{
          title: 'Addons',
          tabBarIcon: ({ color }) => <TabBarIconIonIcon name="extension-puzzle-sharp" color={color} />,
          tabBarIconStyle: { marginVertical: 5 },
        }}
      />
      <Tabs.Screen
        name="settings"
        listeners={{
          tabPress: () => {
            if (isHapticsSupported()) {
              Haptics.selectionAsync();
            }
          },
        }}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabBarIcon name="gear" color={color} />,
          tabBarIconStyle: { marginVertical: 5 },
        }}
      />
    </Tabs>
  );
}
