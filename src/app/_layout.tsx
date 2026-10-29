import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { NotificationToast } from '@/components/notifications/notification-toast';
import { useResumeBooking } from '@/hooks/use-resume-booking';
import { useNotifications } from '@/hooks/useNotifications';
import { AuthProvider, useAuth } from '@/lib/auth';
import { CartProvider } from '@/lib/tests/cart-context';

SplashScreen.preventAutoHideAsync().catch(() => {});
const queryClient = new QueryClient();

function ResumeBooking() {
  useResumeBooking();
  return null;
}

function Routes() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const notifications = useNotifications(user?.id ?? null);

  // The next account on this phone must never see the last one's cached bookings.
  useEffect(() => {
    if (!user) queryClient.clear();
  }, [user, queryClient]);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  if (loading) return null;

  return (
    <>
      {user && <ResumeBooking />}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="consult" />
          <Stack.Screen name="doctor" />
          <Stack.Screen name="tests" />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
      <NotificationToast toast={notifications.toast} onOpen={notifications.openToast} onDismiss={notifications.dismissToast} />
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <StatusBar style="dark" />
          <Routes />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
