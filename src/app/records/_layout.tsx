import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

export default function RecordsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: Colors.primary,
        headerTitleStyle: { color: Colors.foreground, fontWeight: '700' },
        headerBackTitle: 'Back',
      }}>
      <Stack.Screen name="report/[id]" options={{ title: 'Lab Report' }} />
    </Stack>
  );
}
