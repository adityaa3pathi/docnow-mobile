import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Space, Type } from '@/constants/theme';
import { resendLabel } from '@/lib/account/auth-forms';

interface Props {
  seconds: number;
  onResend: () => void;
}

/** "Did not get the OTP?" with the 10-second wait, then a working Resend OTP button. */
export function ResendOtp({ seconds, onResend }: Props) {
  const waiting = seconds > 0;
  const label = resendLabel(seconds);
  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <Text style={styles.ask}>Did not get the OTP?</Text>
      {waiting ? (
        <Text style={styles.waiting}>{label}</Text>
      ) : (
        <Pressable onPress={onResend} accessibilityRole="button" accessibilityLabel={label} style={styles.button}>
          <Text style={styles.buttonText}>{label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space[2], minHeight: 44 },
  ask: { ...Type.small, color: Colors.inkMuted },
  waiting: { ...Type.small, fontFamily: Fonts.medium, color: Colors.inkMuted },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Space[2] },
  buttonText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primary },
});
