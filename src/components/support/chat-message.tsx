import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { WELCOME_ID } from '@/lib/support/messages';
import type { ChatMessage as Message } from '@/lib/support/types';

import { ChatProductCards } from './chat-product-cards';
import { RichText } from './rich-text';

export function ChatBubble({ message, onFeedback }: { message: Message; onFeedback: (id: string, score: number) => void }) {
  const isUser = message.role === 'user';
  const voted = message.feedbackScore !== undefined;

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.botRow}>
      <View style={[styles.botBubble, message.wasAbstained && styles.abstained]}>
        <View style={styles.botHeader}>
          <Text style={styles.botName}>DocNow assistant</Text>
          {message.verified && <Text style={styles.verified}>Verified</Text>}
          {message.wasAbstained && <Text style={styles.flag}>Human support recommended</Text>}
        </View>

        <RichText content={message.content} />

        {message.cards.length > 0 && <ChatProductCards cards={message.cards} />}

        {message.actions.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Actions taken</Text>
            {message.actions.map((action, i) => (
              <Text key={i} style={styles.action}>
                {action}
              </Text>
            ))}
          </View>
        )}

        {message.sources.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Sources</Text>
            <View style={styles.sources}>
              {message.sources.map((source, i) =>
                source.url ? (
                  <Pressable
                    key={i}
                    onPress={() => void Linking.openURL(source.url as string).catch(() => {})}
                    style={({ pressed }) => [styles.source, pressed && styles.sourcePressed]}
                    accessibilityRole="link"
                    accessibilityLabel={`Source: ${source.title}. Opens in your browser`}>
                    <Text style={styles.sourceLink}>{source.title}</Text>
                  </Pressable>
                ) : (
                  <View key={i} style={styles.source}>
                    <Text style={styles.sourceText}>{source.title}</Text>
                  </View>
                ),
              )}
            </View>
          </View>
        )}

        {/* The welcome line is not a reply the server stored, so there is nothing to rate. */}
        {message.id !== WELCOME_ID && (
          <View style={styles.feedback}>
            <Vote
              label="Helpful"
              mark="Yes"
              on={message.feedbackScore === 1}
              disabled={voted}
              onPress={() => onFeedback(message.id, 1)}
            />
            <Vote
              label="Not helpful"
              mark="No"
              on={message.feedbackScore === -1}
              disabled={voted}
              onPress={() => onFeedback(message.id, -1)}
            />
          </View>
        )}
      </View>
    </View>
  );
}

function Vote({ label, mark, on, disabled, onPress }: { label: string; mark: string; on: boolean; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.vote, on && styles.voteOn, pressed && styles.sourcePressed, disabled && !on && styles.voteOff]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on, disabled }}>
      <Text style={[styles.voteText, on && styles.voteTextOn]}>{mark}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  userRow: { alignItems: 'flex-end', marginBottom: Space[3] },
  botRow: { alignItems: 'flex-start', marginBottom: Space[3] },
  userBubble: { maxWidth: '88%', padding: Space[3], borderRadius: Radius.xl, backgroundColor: Colors.primary },
  userText: { ...Type.small, color: Colors.onPrimary },
  botBubble: { maxWidth: '94%', gap: Space[2], padding: Space[3], borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  // An abstained reply is the bot saying a person should answer, so it reads as a warning.
  abstained: { borderColor: Colors.warning, backgroundColor: Colors.warningSoft },
  botHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Space[2] },
  botName: { ...Type.caption, fontSize: 14, lineHeight: 20, fontFamily: Fonts.semibold, color: Colors.inkMuted },
  verified: { ...Type.caption, fontSize: 14, lineHeight: 20, fontFamily: Fonts.medium, color: Colors.successInk },
  flag: { ...Type.caption, fontSize: 14, lineHeight: 20, fontFamily: Fonts.medium, color: Colors.warningInk },
  block: { gap: Space[1], paddingTop: Space[2], borderTopWidth: 1, borderTopColor: Colors.border },
  blockTitle: { ...Type.caption, fontSize: 14, lineHeight: 20, fontFamily: Fonts.semibold, color: Colors.inkMuted },
  action: { ...Type.small, color: Colors.inkMuted },
  sources: { flexDirection: 'row', flexWrap: 'wrap', gap: Space[2] },
  source: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Space[3], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceSubtle },
  sourcePressed: { backgroundColor: Colors.surfaceMuted },
  sourceLink: { ...Type.small, fontFamily: Fonts.medium, color: Colors.primary },
  sourceText: { ...Type.small, color: Colors.inkMuted },
  feedback: { flexDirection: 'row', justifyContent: 'flex-end', gap: Space[2] },
  vote: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space[3], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  voteOn: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  voteOff: { opacity: 0.5 },
  voteText: { ...Type.small, fontFamily: Fonts.medium, color: Colors.inkMuted },
  voteTextOn: { color: Colors.primary },
});
