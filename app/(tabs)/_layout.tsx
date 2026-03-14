import React from 'react';
import { NativeTabs, Label, Icon } from 'expo-router/unstable-native-tabs';
import { useTheme } from '@/context/ThemeContext';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      tintColor={colors.primary}
    >
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
        <Icon sf="house" drawable="ic_home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <Label>Search</Label>
        <Icon sf="magnifyingglass" drawable="ic_search" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="library">
        <Label>Library</Label>
        <Icon sf="square.stack" drawable="ic_library_books" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <Label>Settings</Label>
        <Icon sf="gearshape" drawable="ic_settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}