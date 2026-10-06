import { router, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ErrorState, LoadingBlock } from '@/components/consult/states';
import { Colors } from '@/constants/theme';
import { useDoctorMe } from '@/hooks/use-doctor-me';
import { friendlyError } from '@/lib/consult/api';
import { doctorScreen } from '@/lib/consult/doctorStatus';

export default function DoctorLayout() {
  const { data, isLoading, error, refetch } = useDoctorMe();

  if (isLoading) return <LoadingBlock label="Loading your doctor page" />;
  if (error && data === undefined) {
    return (
      <View style={styles.pad}>
        <ErrorState message={friendlyError(error)} onRetry={() => void refetch()} />
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={styles.back}>
          <Text style={styles.backText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  // Status from the server decides the screen, so a changed status moves the user at once.
  const approved = doctorScreen(data) === 'home';
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: Colors.primary,
        headerTitleStyle: { color: Colors.foreground, fontWeight: '700' },
        headerBackTitle: 'Back',
      }}>
      <Stack.Protected guard={approved}>
        <Stack.Screen name="index" options={{ title: 'Doctor area' }} />
        <Stack.Screen name="consultations" options={{ title: 'Consultations' }} />
        <Stack.Screen name="hours" options={{ title: 'Weekly hours' }} />
        <Stack.Screen name="leave" options={{ title: 'Leave' }} />
      </Stack.Protected>
      <Stack.Protected guard={!approved}>
        <Stack.Screen name="apply" options={{ title: 'Doctor' }} />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1, padding: 16, gap: 12, backgroundColor: Colors.background, justifyContent: 'center' },
  back: { alignItems: 'center', padding: 12 },
  backText: { color: Colors.primary, fontWeight: '700' },
});
