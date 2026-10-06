import { Tabs } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useDoctorMe } from '@/hooks/use-doctor-me';

export default function TabsLayout() {
  const { data: doctor } = useDoctorMe();
  const approved = doctor?.status === 'APPROVED';
  return (
    <Tabs
      screenOptions={{
        headerTitleStyle: { color: Colors.foreground, fontWeight: '700' },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.mutedForeground,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Consult' }} />
      <Tabs.Screen name="tests" options={{ title: 'Lab Tests' }} />
      <Tabs.Screen name="health" options={{ title: 'My Health' }} />
      <Tabs.Screen name="practice" options={{ title: 'Doctor', href: approved ? undefined : null }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
