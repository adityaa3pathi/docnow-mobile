import { useEffect, useRef } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ChatInput } from '@/components/support/chat-input';
import { ChatBubble } from '@/components/support/chat-message';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { useSupportChat } from '@/lib/support/use-support-chat';

export default function SupportChatScreen() {
  const { messages, sendMessage, resetChat, submitFeedback, loading, error } = useSupportChat();
  const listRef = useRef<FlatList>(null);

  // Each new turn scrolls the thread, the way the website pins the panel to the newest reply.
  useEffect(() => {
    const id = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(id);
  }, [messages.length, loading]);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <ChatBubble message={item} onFeedback={(id, score) => void submitFeedback(id, score)} />}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          <View style={styles.footer}>
            {loading && (
              <View style={styles.typing} accessibilityRole="progressbar" accessibilityLabel="The assistant is replying">
                <ActivityIndicator color={Colors.primary} size="small" />
                <Text style={styles.typingText}>Replying...</Text>
              </View>
            )}
            {error && (
              <View style={styles.error} accessibilityRole="alert">
                <Text style={styles.errorText}>{error}</Text>
                <Pressable
                  onPress={resetChat}
                  style={({ pressed }) => [styles.newChat, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Start new chat">
                  <Text style={styles.newChatText}>Start new chat</Text>
                </Pressable>
              </View>
            )}
          </View>
        }
      />
      <ChatInput onSend={(text) => void sendMessage(text)} busy={loading} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surfaceSubtle },
  list: { padding: Space[4], paddingBottom: Space[2] },
  footer: { gap: Space[3] },
  typing: { flexDirection: 'row', alignItems: 'center', gap: Space[2], alignSelf: 'flex-start', paddingVertical: Space[2] },
  typingText: { ...Type.small, color: Colors.inkMuted },
  error: { gap: Space[2], padding: Space[3], borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.danger, backgroundColor: Colors.dangerSoft },
  errorText: { ...Type.small, color: Colors.dangerInk },
  newChat: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: Space[3], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primary },
  newChatText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primary },
  pressed: { backgroundColor: Colors.primarySoft },
});
