import { Tabs } from 'expo-router';
import { BriefcaseMedical, FileText, FlaskConical, House, Stethoscope, User, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius } from '@/constants/theme';
import { useDoctorMe } from '@/hooks/use-doctor-me';
import { useCart } from '@/lib/tests/cart-context';

/** Icon inside a soft purple pill when its tab is active. */
function tabIcon(Icon: LucideIcon) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return (
      <View style={[styles.pill, focused && styles.pillActive]}>
        <Icon size={22} color={color as string} strokeWidth={focused ? 2.4 : 1.9} />
      </View>
    );
  }
  return TabIcon;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { data: doctor } = useDoctorMe();
  const approved = doctor?.status === 'APPROVED';
  const { cartCount } = useCart();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 8,
          shadowColor: '#0F172A',
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -2 },
          height: 66 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
        tabBarItemStyle: { minHeight: 48 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon(House) }} />
      <Tabs.Screen name="doctors" options={{ title: 'Consult', tabBarIcon: tabIcon(Stethoscope) }} />
      <Tabs.Screen
        name="tests"
        options={{
          title: 'Tests',
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: styles.badge,
          tabBarIcon: tabIcon(FlaskConical),
        }}
      />
      <Tabs.Screen name="health" options={{ title: 'Records', tabBarIcon: tabIcon(FileText) }} />
      <Tabs.Screen
        name="practice"
        options={{ title: 'Practice', href: approved ? undefined : null, tabBarIcon: tabIcon(BriefcaseMedical) }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon(User) }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: { width: 56, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full },
  pillActive: { backgroundColor: Colors.primaryTint },
  badge: { backgroundColor: Colors.destructive, color: '#fff', fontSize: 10, fontWeight: '800' },
});
