import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

export default function ConsultLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: Colors.primary,
        headerTitleStyle: { color: Colors.foreground, fontWeight: '700' },
        headerBackTitle: 'Back',
      }}>
      <Stack.Screen name="doctor/[id]" options={{ title: 'Doctor' }} />
      <Stack.Screen name="book" options={{ title: 'Review and pay' }} />
      <Stack.Screen name="booking/[id]" options={{ title: 'Booking' }} />
      <Stack.Screen name="my" options={{ title: 'My consultations' }} />
    </Stack>
  );
}
