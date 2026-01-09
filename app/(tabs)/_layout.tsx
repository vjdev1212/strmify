import React, { useMemo, useState, useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Platform, StyleSheet, View } from 'react-native';
import { isHapticsSupported } from '@/utils/platform';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StorageKeys, storageService } from '@/utils/StorageService';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} {...props} />;
}

export default function TabLayout() {
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
          height: Platform.OS === 'web' ? 70 : undefined,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () => tabBarBackground,
      }}
    >
      <Tabs.Screen
        name="index"
        listeners={{
          tabPress: async () => {
            if (isHapticsSupported()) {
              await Haptics.selectionAsync();
            }
          },
        }}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          tabBarIconStyle: { marginVertical: 5 },
        }}
      />

      <Tabs.Screen
        name="search"
        listeners={{
          tabPress: async () => {
            if (isHapticsSupported()) {
              await Haptics.selectionAsync();
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
        name="settings"
        listeners={{
          tabPress: async () => {
            if (isHapticsSupported()) {
              await Haptics.selectionAsync();
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