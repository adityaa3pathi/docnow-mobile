import { Check, Info, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Type } from '@/constants/theme';
import { ABOUT_TELEMEDICINE } from '@/lib/consult/consent';
import { hapticImpact, ImpactFeedbackStyle } from '@/lib/haptics';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Bigger box and text for the family member's zero-login room. */
  senior?: boolean;
  language?: 'en' | 'hi';
}

/** The NMC telemedicine consent shown above every patient-side Join button, with a "learn more" sheet. */
export function TelemedicineConsent({ checked, onChange, label, senior = false, language = 'en' }: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const about = ABOUT_TELEMEDICINE[language];
  const box = senior ? 30 : 24;

  return (
    <View style={[styles.card, checked && styles.cardOn]} testID="consent-card">
      <Pressable
        testID="consent-checkbox"
        style={styles.row}
        onPress={() => {
          hapticImpact(ImpactFeedbackStyle.Light);
          onChange(!checked);
        }}
        accessibilityRole="checkbox"
        aria-checked={checked}
        accessibilityState={{ checked }}
        accessibilityLabel={label}>
        <View style={[styles.box, { width: box, height: box }, checked && styles.boxOn]}>
          {checked ? <Check size={box - 8} color={Colors.primaryForeground} strokeWidth={3.2} /> : null}
        </View>
        <Text style={[styles.label, senior && styles.labelSenior]}>{label}</Text>
      </Pressable>
      <Pressable testID="consent-learn-more" style={styles.more} onPress={() => setOpen(true)} accessibilityRole="button" hitSlop={8}>
        <Info size={senior ? 18 : 15} color={Colors.primary} />
        <Text style={[styles.moreText, senior && styles.moreSenior]}>{about.learnMore}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} testID="consent-sheet">
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle} accessibilityRole="header">{about.title}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <X size={22} color={Colors.foreground} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.points}>
              {about.points.map((p) => (
                <View key={p} style={styles.point}>
                  <View style={styles.bullet} />
                  <Text style={styles.pointText}>{p}</Text>
                </View>
              ))}
            </ScrollView>
            <Pressable style={styles.done} onPress={() => setOpen(false)} accessibilityRole="button">
              <Text style={styles.doneText}>{language === 'hi' ? 'ठीक है' : 'Got it'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 14, borderRadius: Radius.xl, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card },
  cardOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 44 },
  box: { marginTop: 1, borderRadius: Radius.sm, borderWidth: 2, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card },
  boxOn: { backgroundColor: Colors.primary },
  label: { flex: 1, fontSize: Type.body - 1, lineHeight: 19, color: Colors.foreground },
  labelSenior: { fontSize: 18, lineHeight: 26 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 32 },
  moreText: { fontSize: Type.caption, fontWeight: '700', color: Colors.primary, textDecorationLine: 'underline' },
  moreSenior: { fontSize: 16 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  sheet: { maxHeight: '80%', gap: 12, paddingTop: 20, paddingHorizontal: 20, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, backgroundColor: Colors.card },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sheetTitle: { flex: 1, fontSize: Type.headline - 2, fontWeight: '800', color: Colors.foreground },
  points: { gap: 12, paddingBottom: 8 },
  point: { flexDirection: 'row', gap: 10 },
  bullet: { width: 6, height: 6, marginTop: 8, borderRadius: 3, backgroundColor: Colors.primary },
  pointText: { flex: 1, fontSize: Type.body, lineHeight: 21, color: Colors.foreground },
  done: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, backgroundColor: Colors.primary },
  doneText: { fontSize: Type.title, fontWeight: '800', color: Colors.primaryForeground },
});
