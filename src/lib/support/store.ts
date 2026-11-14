// The only support file that touches AsyncStorage, so the tested files stay free of native code.
import AsyncStorage from '@react-native-async-storage/async-storage';

/** The same key the website uses in localStorage, so the stored id means the same thing. */
const CONVERSATION_KEY = 'docnow_support_conversation_id';

export async function loadConversationId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CONVERSATION_KEY);
  } catch {
    return null;
  }
}

export async function saveConversationId(id: string) {
  try {
    await AsyncStorage.setItem(CONVERSATION_KEY, id);
  } catch {
    // Losing it only costs this chat's history on the next open.
  }
}

export async function clearConversationId() {
  try {
    await AsyncStorage.removeItem(CONVERSATION_KEY);
  } catch {
    // Nothing to recover; the next send starts a new conversation anyway.
  }
}
