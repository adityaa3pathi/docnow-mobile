import { registerGlobals } from '@livekit/react-native';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useResumeBooking } from '@/hooks/use-resume-booking';
import { apiConfigured } from '@/lib/api';
import { AuthProvider, useAuth } from '@/lib/auth';

// LiveKit needs its WebRTC globals before any room is made, so this runs once at start.
registerGlobals();
SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();

function ResumeBooking() {
  useResumeBooking();
  return null;
}

function Routes() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  // The next account on this phone must never see the last one's cached bookings.
  useEffect(() => {
    if (!user) queryClient.clear();
  }, [user, queryClient]);

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
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
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

/** A build without its server address would show "check your connection" on every screen. */
function MissingConfig() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
  return (
    <View style={styles.config}>
      <Text style={styles.configTitle}>This app build is not set up</Text>
      <Text style={styles.configText}>EXPO_PUBLIC_API_URL was not set when this build was made. Rebuild with it set.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  config: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  configTitle: { fontSize: 18, fontWeight: '700' },
  configText: { textAlign: 'center' },
});

export default function RootLayout() {
  if (!apiConfigured) return <MissingConfig />;
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Routes />
      </AuthProvider>
    </QueryClientProvider>
  );
}
