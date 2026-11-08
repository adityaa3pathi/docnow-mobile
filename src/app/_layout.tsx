import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, useFonts } from '@expo-google-fonts/inter';
import { registerGlobals } from '@livekit/react-native';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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

function Offline({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.config} accessibilityRole="alert">
      <Text style={styles.configTitle}>Cannot reach DocNow</Text>
      <Text style={styles.configText}>Check your internet connection. You are still signed in.</Text>
      <Pressable onPress={onRetry} style={styles.retry} accessibilityRole="button" accessibilityLabel="Try again">
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

function Routes() {
  const { user, loading, offline, retry } = useAuth();
  const queryClient = useQueryClient();

  // The next account on this phone must never see the last one's cached bookings.
  useEffect(() => {
    if (!user) queryClient.clear();
  }, [user, queryClient]);

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;
  if (!user && offline) return <Offline onRetry={retry} />;

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
  retry: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: '#4b2192' },
  retryText: { color: '#fff', fontWeight: '700' },
});

export default function RootLayout() {
  // The splash stays up until Inter is ready; a font that fails to load falls back to the system face.
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  if (!apiConfigured) return <MissingConfig />;
  if (!fontsLoaded && !fontError) return null;
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Routes />
      </AuthProvider>
    </QueryClientProvider>
  );
}
