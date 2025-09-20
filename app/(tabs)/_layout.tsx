import React, { useMemo, useState, useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Platform, StyleSheet, View } from 'react-native';
import { isHapticsSupported } from '@/utils/platform';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StorageKeys, storageService } from '@/utils/StorageService';

// Storage key for Trakt enable preference
const TRAKT_ENABLED_KEY = StorageKeys.TRAKT_ENABLED_KEY;

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} {...props} />;
}

// Custom hook for managing Trakt enable state
export const useTraktEnabled = () => {
  const [isTraktEnabled, setIsTraktEnabled] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    loadTraktEnabledState();
  }, []);

  const loadTraktEnabledState = async () => {
    try {
      const stored = await storageService.getItem(TRAKT_ENABLED_KEY);
      if (stored !== null) {
        setIsTraktEnabled(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load Trakt enabled state:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setTraktEnabled = async (enabled: boolean) => {
    try {
      await storageService.setItem(TRAKT_ENABLED_KEY, JSON.stringify(enabled));
      setIsTraktEnabled(enabled);
    } catch (error) {
      console.error('Failed to save Trakt enabled state:', error);
    }
  };

  return { isTraktEnabled, setTraktEnabled, isLoaded };
};

export default function TabLayout() {
  const { isTraktEnabled, isLoaded } = useTraktEnabled();

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

  // Don't render until we've loaded the preference to avoid layout jump
  if (!isLoaded) {
    return null;
  }

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
          tabBarIconStyle: { marginVertical: 5 },
        }}
      />
      
      <Tabs.Screen
        name="trakt"
        listeners={{
          tabPress: () => {
            if (isHapticsSupported()) {
              Haptics.selectionAsync();
            }
          },
        }}
        options={{
          title: 'Trakt',
          tabBarIcon: ({ color }) => <TabBarIcon name="check-square-o" color={color} />,
          tabBarIconStyle: { marginVertical: 5 },
          tabBarItemStyle: isTraktEnabled ? {} : { display: 'none' },
          tabBarButton: isTraktEnabled ? undefined : () => null,
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