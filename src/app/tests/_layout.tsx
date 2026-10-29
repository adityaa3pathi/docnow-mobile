import { Stack } from 'expo-router';

export default function TestsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="explore" />
      <Stack.Screen name="[code]" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="confirmation" />
      <Stack.Screen name="bookings" />
    </Stack>
  );
}
