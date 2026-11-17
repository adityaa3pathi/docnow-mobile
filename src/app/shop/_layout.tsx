import { Stack } from 'expo-router';

import { Colors, Fonts } from '@/constants/theme';

export default function ShopLayout() {
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
      {/* The product page opens on a purple band, so its header joins it. */}
      <Stack.Screen
        name="product/[slug]"
        options={{ title: '', headerStyle: { backgroundColor: Colors.primaryHover }, headerTintColor: Colors.onPrimary }}
      />
      <Stack.Screen name="cart" options={{ title: 'Cart' }} />
      {/* The order is placed by the time this opens, so there is nothing to go back to. */}
      <Stack.Screen name="result" options={{ title: 'Your order', headerBackVisible: false }} />
    </Stack>
  );
}
