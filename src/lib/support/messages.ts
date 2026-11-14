// Ported from docnowtesting/client/src/hooks/useSupportChat.ts. The reply text is copied through
// untouched: symptom advice and emergency wording must reach the reader exactly as the bot sent it.
import { toProductCards } from './cards';
import type { ChatMessage, ChatRole, ChatSource } from './types';

export const WELCOME_ID = 'welcome';

export function welcomeMessage(now: string): ChatMessage {
  return {
    id: WELCOME_ID,
    role: 'assistant',
    content: "Hello! I am DocNow's AI support assistant. How can I help you today?",
    sources: [],
    actions: [],
    cards: [],
    verified: false,
    wasAbstained: false,
    createdAt: now,
  };
}

function toSources(raw: unknown): ChatSource[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[])
    .filter((s) => s && typeof s === 'object')
    .map((s) => ({
      title: typeof s.title === 'string' ? s.title : '',
      url: typeof s.url === 'string' ? s.url : undefined,
      type: typeof s.source_type === 'string' ? s.source_type : typeof s.type === 'string' ? s.type : undefined,
    }));
}

function toActions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .map((a) => {
      if (typeof a === 'string') return a;
      const summary = (a as Record<string, unknown> | null)?.summary;
      return typeof summary === 'string' ? summary : '';
    })
    .filter((a) => a.length > 0);
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function flag(...values: unknown[]): boolean {
  for (const value of values) {
    if (typeof value === 'boolean') return value;
  }
  return false;
}

function score(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number') return value;
  }
  return undefined;
}

export function userMessage(content: string, id: string, now: string): ChatMessage {
  return {
    id,
    role: 'user',
    content,
    sources: [],
    actions: [],
    cards: [],
    verified: false,
    wasAbstained: false,
    createdAt: now,
  };
}

/** One stored turn from `/support/history`. */
export function mapHistoryMessage(raw: unknown, fallbackId: string, now: string): ChatMessage {
  const m = (raw ?? {}) as Record<string, unknown>;
  const role: ChatRole = m.role === 'user' ? 'user' : 'assistant';
  return {
    id: text(m.id) || fallbackId,
    role,
    content: text(m.content),
    sources: toSources(m.sources),
    actions: toActions(m.actions),
    cards: toProductCards(m.cards),
    verified: flag(m.verified),
    wasAbstained: flag(m.was_abstained, m.wasAbstained),
    feedbackScore: score(m.feedback_score, m.feedbackScore),
    createdAt: text(m.created_at) || text(m.createdAt) || now,
  };
}

export function mapHistory(raw: unknown, now: string): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((m, i) => mapHistoryMessage(m, `history-${i}`, now));
}

/** The fresh reply from `/support/chat`; the server may nest it under `message`. */
export function mapChatReply(raw: unknown, fallbackId: string, now: string): ChatMessage {
  const data = (raw ?? {}) as Record<string, unknown>;
  const nested = (data.message ?? {}) as Record<string, unknown>;
  return {
    id: text(data.message_id) || text(nested.id) || fallbackId,
    role: 'assistant',
    content: text(data.content) || text(nested.content),
    sources: toSources(Array.isArray(data.sources) ? data.sources : nested.sources),
    actions: toActions(Array.isArray(data.actions_taken) ? data.actions_taken : nested.actions),
    cards: toProductCards(data.cards),
    verified: flag(data.verified, nested.verified),
    wasAbstained: flag(data.was_abstained, nested.wasAbstained),
    createdAt: now,
  };
}

/** Only a real id is worth storing; `ephemeral` means the server kept no transcript. */
export function storableConversationId(raw: unknown): string | null {
  const id = text(raw);
  return id && id !== 'ephemeral' ? id : null;
}

export function isLoadableConversationId(id: string | null | undefined): boolean {
  return Boolean(id) && id !== 'ephemeral';
}

/** FastAPI sends `detail`, Express sends `error`; showing it beats a generic failure line. */
export function serverErrorMessage(raw: unknown): string | null {
  const data = (raw ?? {}) as Record<string, unknown>;
  for (const key of ['detail', 'error', 'message'] as const) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

/** 404 = the conversation is gone; 400 = its turn cap is reached, so it can never take another message. */
export function forgetAfterSend(status: number | undefined): boolean {
  return status === 404 || status === 400;
}

/** A missing or unauthorised conversation falls back to a fresh chat instead of an error. */
export function forgetAfterHistory(status: number | undefined): boolean {
  return status === 404 || status === 401;
}

/** The launcher dot: the newest reply landed while the chat was closed. */
export function unreadReplyId(messages: ChatMessage[]): string | null {
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'assistant' || last.id === WELCOME_ID) return null;
  return last.id;
}

export function hasUnread(messages: ChatMessage[], seenReplyId: string | null, open: boolean): boolean {
  if (open) return false;
  const latest = unreadReplyId(messages);
  return latest !== null && latest !== seenReplyId;
}
