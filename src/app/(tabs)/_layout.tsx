import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';

import { CityButton } from '@/components/location/city-button';
import { CartButton } from '@/components/shop/cart-button';
import { ChatLauncher } from '@/components/support/chat-launcher';
import { Colors } from '@/constants/theme';
import { useDoctorMe } from '@/hooks/use-doctor-me';

export default function TabsLayout() {
  const { data: doctor } = useDoctorMe();
  const approved = doctor?.status === 'APPROVED';
  return (
    <View style={styles.flex}>
      <Tabs
        screenOptions={{
          headerTitleStyle: { color: Colors.foreground, fontWeight: '700' },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.mutedForeground,
        }}>
        {/* The consult header joins the screen's purple band. */}
        <Tabs.Screen
          name="index"
          options={{ title: 'Consult', headerStyle: { backgroundColor: Colors.primaryHover }, headerTitleStyle: { color: Colors.onPrimary, fontWeight: '700' }, headerShadowVisible: false }}
        />
        {/* The cart lives in the header here, because this tab is where tests get added. */}
        <Tabs.Screen
          name="tests"
          options={{ title: 'Lab Tests', headerLeft: () => <CityButton />, headerRight: () => <CartButton /> }}
        />
        <Tabs.Screen name="health" options={{ title: 'My Health' }} />
        <Tabs.Screen name="practice" options={{ title: 'Doctor', href: approved ? undefined : null }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
      {/* Outside the navigator, so it floats over every tab and lifts clear of the tab bar. */}
      <ChatLauncher />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
