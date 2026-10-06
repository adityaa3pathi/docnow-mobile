import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { useDoctorMe } from '@/hooks/use-doctor-me';
import { useAuth } from '@/lib/auth';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const doctor = useDoctorMe();
  // No application yet is a loaded, empty answer. Anything else opens the Doctor area.
  const doctorLabel = doctor.isSuccess && doctor.data === null ? 'Join as a doctor' : 'Doctor area';
  return (
    <View style={styles.wrap}>
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
        onPress={() => router.push('/doctor')}
        accessibilityRole="button"
        accessibilityLabel={doctorLabel}>
        <Text style={styles.rowText}>{doctorLabel}</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, backgroundColor: Colors.background, gap: 6 },
  name: { fontSize: 22, fontWeight: '700', color: Colors.foreground },
  mobile: { color: Colors.mutedForeground, marginBottom: 20 },
  row: { borderRadius: Radius.xl, padding: 16, borderWidth: 1, borderColor: Colors.muted, marginBottom: 12 },
  rowText: { color: Colors.foreground, fontWeight: '700' },
  button: { backgroundColor: Colors.primaryTint, borderRadius: Radius.xl, padding: 16, alignItems: 'center' },
  buttonText: { color: Colors.primary, fontWeight: '700' },
});
