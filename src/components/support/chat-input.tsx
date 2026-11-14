import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';

export const MAX_CHARS = 2000;

export function ChatInput({ onSend, busy }: { onSend: (text: string) => void; busy: boolean }) {
  const [text, setText] = useState('');
  const over = text.length > MAX_CHARS;
  const ready = text.trim().length > 0 && !busy && !over;

  const send = () => {
    if (!ready) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Ask about tests, bookings or policies"
          placeholderTextColor={Colors.inkSubtle}
          style={styles.input}
          multiline
          editable={!busy}
          accessibilityLabel="Your message"
          accessibilityHint="Type a question for the support assistant"
        />
        <Pressable
          onPress={send}
          disabled={!ready}
          style={({ pressed }) => [styles.send, pressed && styles.pressed, !ready && styles.sendOff]}
          accessibilityRole="button"
          accessibilityLabel={busy ? 'Sending' : 'Send message'}
          accessibilityState={{ disabled: !ready, busy }}>
          <Text style={styles.sendText}>{busy ? 'Sending' : 'Send'}</Text>
        </Pressable>
      </View>
      {text.length > 0 && (
        <Text style={[styles.count, over && styles.countOver]} accessibilityLiveRegion={over ? 'polite' : 'none'}>
          {text.length} of {MAX_CHARS}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Space[1], padding: Space[3], borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Space[2] },
  input: { ...Type.small, flex: 1, minHeight: 44, maxHeight: 120, paddingHorizontal: Space[3], paddingTop: Space[3], paddingBottom: Space[3], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.ink, backgroundColor: Colors.surfaceSubtle },
  send: { minHeight: 44, minWidth: 72, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space[4], borderRadius: Radius.md, backgroundColor: Colors.primary },
  pressed: { backgroundColor: Colors.primaryHover },
  sendOff: { opacity: 0.5 },
  sendText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.onPrimary },
  count: { ...Type.small, color: Colors.inkMuted, textAlign: 'right' },
  countOver: { color: Colors.dangerInk, fontFamily: Fonts.medium },
});
