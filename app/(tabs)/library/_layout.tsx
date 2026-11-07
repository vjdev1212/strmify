import { Stack } from 'expo-router';
import { Platform, View } from 'react-native';
import { systemDarkBackground } from '@/constants/theme';

const TransparentHeaderBackground = () => (
  <View style={{ flex: 1, backgroundColor: 'transparent' }} />
);

export default function LibraryLayout() {
  const isIOS = Platform.OS === 'ios';

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackVisible: false,
        headerTransparent: isIOS,
        headerBackground: TransparentHeaderBackground,
        headerShadowVisible: true,
        headerStyle: { backgroundColor: isIOS ? 'transparent' : systemDarkBackground },
        headerLargeTitleEnabled: false,
        headerLargeStyle: { backgroundColor: 'transparent' },
        headerLargeTitleShadowVisible: true,
        headerBlurEffect: 'none',
        contentStyle: { backgroundColor: systemDarkBackground },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Library' }} />
    </Stack>
  );
}
