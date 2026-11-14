import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { useDoctorMe } from '@/hooks/use-doctor-me';
import { useAuth } from '@/lib/auth';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const doctor = useDoctorMe();
  // No application yet is a loaded, empty answer. Anything else opens the Doctor area.
  const doctorLabel = doctor.isSuccess && doctor.data === null ? 'Join as a doctor' : 'Doctor area';
  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.wrap}>
      <Text style={styles.name}>{user?.name ?? 'DocNow user'}</Text>
      <Text style={styles.mobile}>{user?.mobile}</Text>
      <Pressable
        style={styles.row}
        onPress={() => router.push('/consult/my')}
        accessibilityRole="button"
        accessibilityLabel="My consultations">
        <Text style={styles.rowText}>My consultations</Text>
      </Pressable>
      <Pressable
        style={styles.row}
        onPress={() => router.push('/lab/bookings')}
        accessibilityRole="button"
        accessibilityLabel="Lab bookings">
        <Text style={styles.rowText}>Lab bookings</Text>
      </Pressable>
      <Pressable
        style={styles.row}
        onPress={() => router.push('/lab/reports')}
        accessibilityRole="button"
        accessibilityLabel="Reports">
        <Text style={styles.rowText}>Reports</Text>
      </Pressable>
      <Pressable
        style={styles.row}
        onPress={() => router.push('/doctor')}
        accessibilityRole="button"
        accessibilityLabel={doctorLabel}>
        <Text style={styles.rowText}>{doctorLabel}</Text>
      </Pressable>
      <Pressable
        style={styles.row}
        onPress={() => router.push('/info/help')}
        accessibilityRole="button"
        accessibilityLabel="Help and support">
        <Text style={styles.rowText}>Help and support</Text>
      </Pressable>
      <Pressable
        style={styles.row}
        onPress={() => router.push('/info/about')}
        accessibilityRole="button"
        accessibilityLabel="About DocNow">
        <Text style={styles.rowText}>About DocNow</Text>
      </Pressable>
      {/* Logout waits for the server to end the session, which can take a while on a slow network. */}
      <Pressable
        style={[styles.button, leaving && styles.busy]}
        disabled={leaving}
        onPress={() => {
          setLeaving(true);
          void signOut().finally(() => setLeaving(false));
        }}
        accessibilityRole="button"
        accessibilityLabel={leaving ? 'Logging out' : 'Log out'}
        accessibilityState={{ disabled: leaving, busy: leaving }}>
        <Text style={styles.buttonText}>{leaving ? 'Logging out...' : 'Log out'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  wrap: { padding: 24, gap: 6 },
  name: { fontSize: 22, fontWeight: '700', color: Colors.foreground },
  mobile: { color: Colors.mutedForeground, marginBottom: 20 },
  row: { borderRadius: Radius.xl, padding: 16, borderWidth: 1, borderColor: Colors.muted, marginBottom: 12 },
  rowText: { color: Colors.foreground, fontWeight: '700' },
  button: { backgroundColor: Colors.primaryTint, borderRadius: Radius.xl, padding: 16, alignItems: 'center' },
  buttonText: { color: Colors.primary, fontWeight: '700' },
  busy: { opacity: 0.6 },
});
