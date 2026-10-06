import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius } from '@/constants/theme';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function Login() {
  const { sendOtp, verifyOtp } = useAuth();
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    setBusy(true);
    try {
      if (!otpSent) {
        await sendOtp(mobile);
        setOtpSent(true);
      } else {
        await verifyOtp(mobile, code);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const ready = otpSent ? code.length >= 4 : /^\d{10}$/.test(mobile);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.body}>
        <Text style={styles.brand}>DocNow</Text>
        <Text style={styles.title}>Log in with your mobile number</Text>

        <TextInput
          style={styles.input}
          placeholder="10-digit mobile number"
          keyboardType="number-pad"
          maxLength={10}
          value={mobile}
          onChangeText={setMobile}
          editable={!otpSent}
        />
        {otpSent && (
          <TextInput
            style={styles.input}
            placeholder="Enter OTP"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            autoFocus
          />
        )}

        {error !== '' && <Text style={styles.error}>{error}</Text>}

        <Pressable style={[styles.button, (!ready || busy) && styles.disabled]} disabled={!ready || busy} onPress={submit}>
          {busy ? <ActivityIndicator color={Colors.primaryForeground} /> : <Text style={styles.buttonText}>{otpSent ? 'Verify and log in' : 'Send OTP'}</Text>}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 14 },
  brand: { fontSize: 32, fontWeight: '800', color: Colors.primary },
  title: { fontSize: 18, fontWeight: '600', color: Colors.foreground, marginBottom: 8 },
  input: { backgroundColor: '#f3f3f5', borderRadius: Radius.xl, padding: 16, fontSize: 16, color: Colors.foreground },
  error: { color: Colors.destructive, fontSize: 14 },
  button: { backgroundColor: Colors.primary, borderRadius: Radius.xl, padding: 16, alignItems: 'center' },
  disabled: { opacity: 0.5 },
  buttonText: { color: Colors.primaryForeground, fontSize: 16, fontWeight: '700' },
});
