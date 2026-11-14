import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, Radius, Shadow, Space, Type } from '@/constants/theme';

/** Default bottom tab bar height, so the button sits above it instead of over a tab. */
const TAB_BAR = Platform.OS === 'ios' ? 49 : 56;

/** The floating support button. It renders only on the main tabs, which carry no pay bar, and
 *  sits clear of the tab bar and the home indicator. */
export function ChatLauncher() {
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom + TAB_BAR + Space[4];

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <Pressable
        onPress={() => router.push('/support/chat')}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Open support chat"
        accessibilityHint="Ask the DocNow assistant about tests, bookings or policies">
        <Text style={styles.label}>Help</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: Space[4] },
  button: { minHeight: 56, minWidth: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space[4], borderRadius: Radius.full, backgroundColor: Colors.primary, ...Shadow.raised },
  pressed: { backgroundColor: Colors.primaryHover },
  label: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.onPrimary },
});
