import { Stack } from 'expo-router';

import { Colors, Fonts } from '@/constants/theme';

export default function SupportLayout() {
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
      <Stack.Screen name="chat" options={{ title: 'DocNow support' }} />
    </Stack>
  );
}
