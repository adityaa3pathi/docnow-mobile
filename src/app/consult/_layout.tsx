import { Stack } from 'expo-router';

import { Colors, Fonts } from '@/constants/theme';

export default function ConsultLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: Colors.primary,
        // Inter semibold is the heaviest face DESIGN.md allows for headings.
        headerTitleStyle: { color: Colors.ink, fontFamily: Fonts.semibold },
        headerStyle: { backgroundColor: Colors.surface },
        headerShadowVisible: false,
        headerBackTitle: 'Back',
      }}>
      <Stack.Screen name="doctor/[id]" options={{ title: 'Doctor' }} />
      <Stack.Screen name="book" options={{ title: 'Review and pay' }} />
      <Stack.Screen name="booking/[id]" options={{ title: 'Booking' }} />
      <Stack.Screen name="my" options={{ title: 'My consultations' }} />
    </Stack>
  );
}
