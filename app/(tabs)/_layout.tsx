import { NativeTabs } from 'expo-router/native-tabs';
import { useTheme } from '@/context/ThemeContext';
import { Colors, systemDarkBackground } from '@/constants/theme';

export default function TabLayout() {
  const { colors } = useTheme();
  const tabContentStyle = { backgroundColor: systemDarkBackground };
  const searchTabContentStyle = { backgroundColor: 'transparent' };

  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      tintColor={colors.primary}
      backgroundColor={Colors.background}
    >
      <NativeTabs.Trigger name="index" contentStyle={tabContentStyle}>
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" drawable="ic_home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search" contentStyle={searchTabContentStyle}>
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" drawable="ic_search" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="library" contentStyle={tabContentStyle}>
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.stack" drawable="ic_library_books" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings" contentStyle={tabContentStyle}>
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape" drawable="ic_settings" />
      </NativeTabs.Trigger>

    </NativeTabs>
  );
}