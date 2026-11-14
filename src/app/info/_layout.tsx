import { Stack } from 'expo-router';

import { Colors, Fonts } from '@/constants/theme';

export default function InfoLayout() {
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
      <Stack.Screen name="help" options={{ title: 'Help' }} />
      <Stack.Screen name="about" options={{ title: 'About DocNow' }} />
      <Stack.Screen name="contact" options={{ title: 'Contact' }} />
      <Stack.Screen name="corporate" options={{ title: 'Corporate enquiry' }} />
      <Stack.Screen name="terms" options={{ title: 'Terms' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
    </Stack>
  );
}
