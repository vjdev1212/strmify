import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/components/useColorScheme';
import { Platform } from 'react-native';
import { isHapticsSupported } from '@/utils/platform';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const isWeb = Platform.OS === 'web';
  const colorScheme = isWeb ? 'dark' : useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#535aff',
        headerShown: false,
        tabBarStyle: { height: Platform.OS === 'web' ? 70 : 65 },
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
          tabBarIcon: ({ color }) => <TabBarIcon name="puzzle-piece" color={color} />,
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
