import { Platform } from 'react-native';
import { NativeTabs } from 'expo-router/native-tabs';
import { useTheme } from '@/context/ThemeContext';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      tintColor={colors.primary}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" drawable="ic_home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search" role={Platform.OS === 'ios' ? 'search' : undefined}>
        {Platform.OS !== 'ios' && <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>}
        {Platform.OS !== 'ios' && (
          <NativeTabs.Trigger.Icon sf="magnifyingglass" drawable="ic_search" />
        )}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.stack" drawable="ic_library_books" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape" drawable="ic_settings" />
      </NativeTabs.Trigger>

    </NativeTabs>
  );
}