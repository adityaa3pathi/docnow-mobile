import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { usePrecallNotes } from '@/hooks/use-precall-notes';
import { QUESTIONS_MAX } from '@/lib/consult/waitingRoom';

/** "Questions for the doctor": written before the call, open again from the in-call sheet. */
export function QuestionsNotepad({ consultationId, inCall = false }: { consultationId: string; inCall?: boolean }) {
  const { notes, setQuestions } = usePrecallNotes(consultationId);
  return (
    <View style={styles.wrap}>
      {!inCall ? (
        <>
          <Text style={styles.title} accessibilityRole="header">Questions for the doctor</Text>
          <Text style={styles.hint}>Note symptoms, how long you have had them, and anything you want to ask. They stay on this phone.</Text>
        </>
      ) : (
        <Text style={styles.hint}>Your notes from the waiting room. Edits are saved as you type.</Text>
      )}
      <TextInput
        testID="precall-questions"
        style={[styles.input, inCall && styles.inputTall]}
        value={notes.questions}
        onChangeText={setQuestions}
        placeholder={'e.g. Fever for 3 days, worse at night\nShould I continue my BP tablet?'}
        placeholderTextColor={Colors.mutedForeground}
        multiline
        maxLength={QUESTIONS_MAX}
        textAlignVertical="top"
        accessibilityLabel="Questions for the doctor"
      />
      <Text style={styles.counter}>{notes.questions.length ? 'Saved on this phone' : ' '}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.foreground },
  hint: { fontSize: 13, color: Colors.mutedForeground, lineHeight: 18 },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    padding: 12,
    fontSize: 14,
    color: Colors.foreground,
  },
  inputTall: { minHeight: 180 },
  counter: { fontSize: 11, color: Colors.mutedForeground, textAlign: 'right' },
});
