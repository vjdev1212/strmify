import { Stack } from 'expo-router';
import { systemDarkBackground } from '@/constants/theme';

export default function SearchLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackVisible: false,
        contentStyle: { backgroundColor: systemDarkBackground },
      }}
    />
  );
}
