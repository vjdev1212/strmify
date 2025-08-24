import React, { useMemo } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Platform, StyleSheet, View } from 'react-native';
import { isHapticsSupported } from '@/utils/platform';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} {...props} />;
}

export default function TabLayout() {

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

  // Memoize background to avoid re-render crashes
  const tabBarBackground = useMemo(() => (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
    >
      <BlurView
        intensity={50}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  ), []);

  const webFontFamily = Platform.OS === 'web'
    ? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    : undefined;

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: '#535aff',
        headerShown: false,
        tabBarHideOnKeyboard: Platform.OS === 'ios',
        tabBarLabelStyle: {
          fontFamily: webFontFamily,
        },
        headerTitleStyle: {
          fontFamily: webFontFamily,
        },
        tabBarStyle: {
          position: 'absolute',
          height: getTabBarHeight(),
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () => tabBarBackground,
      }}
    >
      {[
        { name: 'index', title: 'Home', icon: 'home' },
        { name: 'trakt', title: 'Trakt', icon: 'check-square-o' },
        { name: 'search', title: 'Search', icon: 'search' },
        { name: 'iptv', title: 'TV', icon: 'tv' },
        { name: 'settings', title: 'Settings', icon: 'gear' },
      ].map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          listeners={{
            tabPress: () => {
              if (isHapticsSupported()) {
                Haptics.selectionAsync();
              }
            },
          }}
          options={{
            title,
            tabBarIcon: ({ color }) => <TabBarIcon name={icon as any} color={color} />,
            tabBarIconStyle: { marginVertical: 5 },
          }}
        />
      ))}
    </Tabs>
  );
}
