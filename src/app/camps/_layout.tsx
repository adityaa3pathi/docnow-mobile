import { Stack } from 'expo-router';

import { Colors, Fonts } from '@/constants/theme';

export default function CampsLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Health camps' }} />
      <Stack.Screen name="[id]" options={{ title: 'Camp' }} />
      {/* The registration is placed by the time this opens, so there is nothing to go back to. */}
      <Stack.Screen name="result" options={{ title: 'Your registration', headerBackVisible: false }} />
    </Stack>
  );
}
