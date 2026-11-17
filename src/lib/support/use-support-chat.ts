// Ported from docnowtesting/client/src/hooks/useSupportChat.ts, including the startedRef fix: a
// slow sign-in check finishing later must never wipe a chat the person has already started.
import { isAxiosError } from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/lib/auth';

import { supportApi } from './api';
import {
  forgetAfterHistory,
  forgetAfterSend,
  isLoadableConversationId,
  mapChatReply,
  mapHistory,
  serverErrorMessage,
  storableConversationId,
  userMessage,
  welcomeMessage,
} from './messages';
import { clearConversationId, loadConversationId, saveConversationId } from './store';
import type { ChatMessage } from './types';

const nowIso = () => new Date().toISOString();
const localId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function statusOf(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}

function messageOf(error: unknown, fallback: string): string {
  if (isAxiosError(error) && !error.response) {
    return 'We could not reach the server. Check your connection and try again.';
  }
  return (isAxiosError(error) ? serverErrorMessage(error.response?.data) : null) ?? fallback;
}

export function useSupportChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcomeMessage(nowIso())]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Set once the person sends; guards their chat against the startup effect running late.
  const startedRef = useRef(false);
  const liveRef = useRef(true);
  useEffect(() => {
    liveRef.current = true;
    return () => {
      liveRef.current = false;
    };
  }, []);

  const resetChat = useCallback(() => {
    startedRef.current = false;
    void clearConversationId();
    setConversationId(null);
    setError(null);
    setMessages([welcomeMessage(nowIso())]);
  }, []);

  const loadHistory = useCallback(async (id: string) => {
    if (!isLoadableConversationId(id)) return;
    setLoading(true);
    setError(null);
    try {
      const data = await supportApi.history(id);
      const stored = mapHistory(data?.messages, nowIso());
      if (!liveRef.current) return;
      setMessages(stored.length > 0 ? stored : [welcomeMessage(nowIso())]);
    } catch (e) {
      if (!liveRef.current) return;
      if (forgetAfterHistory(statusOf(e))) {
        void clearConversationId();
        setConversationId(null);
        setMessages([welcomeMessage(nowIso())]);
        setError(null);
      } else {
        setMessages((prev) => (prev.length > 0 ? prev : [welcomeMessage(nowIso())]));
        setError('Could not load this chat. You can start a new one.');
      }
    } finally {
      if (liveRef.current) setLoading(false);
    }
  }, []);

  // Signing out must not leave the next account on this phone holding the last person's chat.
  useEffect(() => {
    if (user) return;
    startedRef.current = false;
    void clearConversationId().then(() => {
      if (!liveRef.current) return;
      setConversationId(null);
      setMessages([welcomeMessage(nowIso())]);
      setError(null);
    });
  }, [user]);

  // Pick up the stored conversation once, unless the person is already typing in a fresh one.
  useEffect(() => {
    if (!user || startedRef.current) return;
    void loadConversationId().then((stored) => {
      if (!liveRef.current || startedRef.current) return;
      if (isLoadableConversationId(stored)) {
        setConversationId(stored);
        void loadHistory(stored as string);
      }
    });
  }, [user, loadHistory]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      startedRef.current = true;
      setMessages((prev) => [...prev, userMessage(trimmed, localId(), nowIso())]);
      setLoading(true);
      setError(null);

      try {
        const data = await supportApi.chat(trimmed, conversationId);
        const nextId = storableConversationId(data?.conversation_id);
        if (!liveRef.current) return;
        if (nextId && nextId !== conversationId) {
          setConversationId(nextId);
          void saveConversationId(nextId);
        } else if (!nextId && data?.conversation_id === 'ephemeral') {
          setConversationId('ephemeral');
          void clearConversationId();
        }
        setMessages((prev) => [...prev, mapChatReply(data, localId(), nowIso())]);
      } catch (e) {
        if (!liveRef.current) return;
        if (forgetAfterSend(statusOf(e))) {
          void clearConversationId();
          setConversationId(null);
        }
        setError(messageOf(e, 'Could not send your message. Please try again.'));
      } finally {
        if (liveRef.current) setLoading(false);
      }
    },
    [conversationId, loading],
  );

  const submitFeedback = useCallback(async (messageId: string, score: number) => {
    try {
      await supportApi.feedback(messageId, score);
      if (!liveRef.current) return;
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, feedbackScore: score } : m)));
    } catch {
      // Feedback is optional; a failed vote leaves the thumbs ready to try again.
    }
  }, []);

  return { messages, sendMessage, resetChat, submitFeedback, loading, error, conversationId };
}
