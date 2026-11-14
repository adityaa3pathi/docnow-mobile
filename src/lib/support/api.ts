/** The three AI support routes, proxied by the Express server to the Python service. */
import { api } from '@/lib/api';

export interface ChatReply {
  conversation_id?: string;
}

export const supportApi = {
  chat: (message: string, conversationId: string | null) =>
    api
      .post<Record<string, unknown> & ChatReply>('/api/support/chat', {
        message,
        conversation_id: conversationId,
      })
      .then((r) => r.data),

  history: (conversationId: string) =>
    api
      .get<{ messages?: unknown[] }>('/api/support/history', { params: { conversation_id: conversationId } })
      .then((r) => r.data),

  feedback: (messageId: string, score: number) =>
    api.post('/api/support/feedback', { message_id: messageId, score }).then((r) => r.data),
};
