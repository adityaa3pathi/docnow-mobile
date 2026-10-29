import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/theme';
import { useDoctorMe } from '@/hooks/use-doctor-me';
import { useCart } from '@/lib/tests/cart-context';

export default function TabsLayout() {
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
          elevation: 4,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>🏠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="tests"
        options={{
          title: 'Lab Tests',
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: Colors.primary,
            color: '#fff',
            fontSize: 10,
            fontWeight: '700',
          },
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>🧪</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'My Health',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>📋</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Doctor',
          href: approved ? undefined : null,
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>🩺</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}
