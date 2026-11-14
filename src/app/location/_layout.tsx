import { Stack } from 'expo-router';

import { Colors, Fonts } from '@/constants/theme';

export default function LocationLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: Colors.primary,
        headerTitleStyle: { color: Colors.ink, fontFamily: Fonts.semibold },
        headerStyle: { backgroundColor: Colors.surface },
        headerShadowVisible: false,
        headerBackTitle: 'Back',
      }}>
      <Stack.Screen name="city" options={{ title: 'Select your location' }} />
    </Stack>
  );
}
