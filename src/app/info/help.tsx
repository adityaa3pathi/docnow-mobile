import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ContactRow } from '@/components/info/info-blocks';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import {
  FAQS_TITLE,
  HELP_TITLE,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_LINK,
} from '@/lib/info/support-config';

/** Help and FAQs in one screen. The website builds both from a markdown file missing from the
 *  repo, so there is no published answer text to copy; these routes lead to support instead. */
export default function HelpScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.wrap}>
      <Text style={styles.title} accessibilityRole="header">
        {HELP_TITLE}
      </Text>

      <Text style={styles.body}>
        Our support team answers booking, rescheduling and report questions during the hours below.
      </Text>

      <ContactRow label="Call or WhatsApp" value={SUPPORT_PHONE_DISPLAY} href={`tel:${SUPPORT_PHONE_LINK}`} />
      <ContactRow label="Email support" value={SUPPORT_EMAIL} href={`mailto:${SUPPORT_EMAIL}`} />
      <ContactRow label="Support hours" value={SUPPORT_HOURS} />

      <Text style={styles.heading} accessibilityRole="header">
        {FAQS_TITLE}
      </Text>
      <Text style={styles.body}>
        The published answers are not available in this build. Ask the support assistant, or contact the team, and we
        will answer directly.
      </Text>

      <View style={styles.actions}>
        <Action label="Ask the support assistant" onPress={() => router.push('/support/chat')} primary />
        <Action label="Contact and callback" onPress={() => router.push('/info/contact')} />
        <Action label="Corporate enquiry" onPress={() => router.push('/info/corporate')} />
        <Action label="About DocNow" onPress={() => router.push('/info/about')} />
        <Action label="Terms and conditions" onPress={() => router.push('/info/terms')} />
        <Action label="Privacy policy" onPress={() => router.push('/info/privacy')} />
      </View>
    </ScrollView>
  );
}

function Action({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.action, primary && styles.actionPrimary, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  wrap: { padding: Space[4], gap: Space[3], paddingBottom: Space[12] },
  title: { ...Type.title, color: Colors.ink },
  heading: { ...Type.titleSm, color: Colors.ink, marginTop: Space[4] },
  body: { ...Type.body, color: Colors.inkMuted },
  actions: { gap: Space[2], marginTop: Space[2] },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Space[4], borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  actionPrimary: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  pressed: { backgroundColor: Colors.surfaceMuted },
  actionText: { ...Type.body, fontFamily: Fonts.medium, color: Colors.ink },
  actionTextPrimary: { color: Colors.primary, fontFamily: Fonts.semibold },
});
