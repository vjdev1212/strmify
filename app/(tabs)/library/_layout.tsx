import { Stack } from 'expo-router';
import { Platform, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

const TransparentHeaderBackground = () => (
  <View style={{ flex: 1, backgroundColor: 'transparent' }} />
);

export default function LibraryLayout() {
  const isIOS = Platform.OS === 'ios';
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackVisible: false,
        headerTransparent: isIOS,
        headerBackground: TransparentHeaderBackground,
        headerShadowVisible: true,
        headerStyle: { backgroundColor: isIOS ? 'transparent' : colors.background },
        headerLargeTitleEnabled: false,
        headerLargeStyle: { backgroundColor: 'transparent' },
        headerLargeTitleShadowVisible: true,
        headerBlurEffect: 'none',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Library' }} />
    </Stack>
  );
}
