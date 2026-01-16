import React from 'react';
import { NativeTabs, Label, Icon } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
        <Icon sf="house.fill" drawable="ic_home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <Label>Search</Label>
        <Icon sf="magnifyingglass" drawable="ic_search" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="library">
        <Label>Library</Label>
        <Icon sf="books.vertical.fill" drawable="ic_library" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <Label>Settings</Label>
        <Icon sf="gearshape.fill" drawable="ic_settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}