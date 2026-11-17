import { describe, expect, it } from 'vitest';

import {
  forgetAfterHistory,
  forgetAfterSend,
  hasUnread,
  isLoadableConversationId,
  mapChatReply,
  mapHistory,
  mapHistoryMessage,
  serverErrorMessage,
  storableConversationId,
  unreadReplyId,
  userMessage,
  welcomeMessage,
  WELCOME_ID,
} from './messages';

const NOW = '2026-11-14T00:00:00.000Z';

describe('mapHistoryMessage', () => {
  it('reads a stored turn, including the snake_case flags and the feedback score', () => {
    const message = mapHistoryMessage(
      {
        id: 'm1',
        role: 'assistant',
        content: 'Fasting is needed for 10 hours.',
        sources: [{ title: 'Test policy', url: 'https://docnow.in/help', source_type: 'doc' }],
        actions: ['Looked up your booking'],
        cards: [{ code: 'c1', name: 'Lipid Profile', price: 500 }],
        verified: true,
        was_abstained: false,
        feedback_score: 1,
        created_at: '2026-11-13T10:00:00.000Z',
      },
      'fallback',
      NOW,
    );

    expect(message.id).toBe('m1');
    expect(message.role).toBe('assistant');
    expect(message.content).toBe('Fasting is needed for 10 hours.');
    expect(message.sources).toEqual([{ title: 'Test policy', url: 'https://docnow.in/help', type: 'doc' }]);
    expect(message.actions).toEqual(['Looked up your booking']);
    expect(message.cards).toHaveLength(1);
    expect(message.verified).toBe(true);
    expect(message.feedbackScore).toBe(1);
    expect(message.createdAt).toBe('2026-11-13T10:00:00.000Z');
  });

  it('accepts the camelCase spellings the server also sends', () => {
    const message = mapHistoryMessage({ wasAbstained: true, feedbackScore: -1, createdAt: NOW }, 'fallback', NOW);
    expect(message.wasAbstained).toBe(true);
    expect(message.feedbackScore).toBe(-1);
  });

  it('falls back to the given id and treats an unknown role as the assistant', () => {
    const message = mapHistoryMessage({ role: 'system' }, 'history-3', NOW);
    expect(message.id).toBe('history-3');
    expect(message.role).toBe('assistant');
    expect(message.content).toBe('');
    expect(message.feedbackScore).toBeUndefined();
  });

  it('maps a list of turns and keeps their order', () => {
    const list = mapHistory([{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hello' }], NOW);
    expect(list.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(mapHistory(undefined, NOW)).toEqual([]);
  });
});

describe('mapChatReply', () => {
  it('reads a flat reply', () => {
    const reply = mapChatReply(
      {
        message_id: 'r1',
        content: 'Please call 108 now.',
        sources: [{ title: 'Emergency' }],
        actions_taken: [{ summary: 'Flagged as urgent' }],
        cards: [{ code: 'c1', name: 'ECG', price: 400 }],
        verified: true,
        was_abstained: true,
      },
      'fallback',
      NOW,
    );

    expect(reply.id).toBe('r1');
    expect(reply.content).toBe('Please call 108 now.');
    expect(reply.actions).toEqual(['Flagged as urgent']);
    expect(reply.wasAbstained).toBe(true);
    expect(reply.cards[0].code).toBe('c1');
    expect(reply.createdAt).toBe(NOW);
  });

  it('reads a reply nested under message', () => {
    const reply = mapChatReply(
      { message: { id: 'r2', content: 'Reports arrive in 24 hours.', sources: [{ title: 'FAQ' }], verified: true } },
      'fallback',
      NOW,
    );
    expect(reply.id).toBe('r2');
    expect(reply.content).toBe('Reports arrive in 24 hours.');
    expect(reply.sources).toEqual([{ title: 'FAQ', url: undefined, type: undefined }]);
    expect(reply.verified).toBe(true);
  });

  it('never alters the reply text, including emergency wording', () => {
    const text = 'This may be a medical emergency. Call 108 immediately, do not wait for a lab report.';
    expect(mapChatReply({ content: text }, 'id', NOW).content).toBe(text);
  });

  it('is always from the assistant, even if the payload claims otherwise', () => {
    expect(mapChatReply({ role: 'user', content: 'x' }, 'id', NOW).role).toBe('assistant');
  });

  it('survives an empty or malformed payload', () => {
    const reply = mapChatReply(null, 'fallback', NOW);
    expect(reply.id).toBe('fallback');
    expect(reply.content).toBe('');
    expect(reply.cards).toEqual([]);
    expect(reply.sources).toEqual([]);
  });

  it('drops an action with no summary string', () => {
    const reply = mapChatReply({ actions_taken: [{ summary: 'Kept' }, { note: 'no summary' }, 'Plain'] }, 'id', NOW);
    expect(reply.actions).toEqual(['Kept', 'Plain']);
  });
});

describe('conversation id handling', () => {
  it('stores only a real id', () => {
    expect(storableConversationId('abc-123')).toBe('abc-123');
    expect(storableConversationId('ephemeral')).toBeNull();
    expect(storableConversationId(undefined)).toBeNull();
    expect(storableConversationId('')).toBeNull();
  });

  it('only loads history for an id the server kept', () => {
    expect(isLoadableConversationId('abc-123')).toBe(true);
    expect(isLoadableConversationId('ephemeral')).toBe(false);
    expect(isLoadableConversationId(null)).toBe(false);
  });

  it('forgets a conversation that is gone or out of turns', () => {
    expect(forgetAfterSend(404)).toBe(true);
    expect(forgetAfterSend(400)).toBe(true);
    expect(forgetAfterSend(500)).toBe(false);
    expect(forgetAfterSend(undefined)).toBe(false);
  });

  it('falls back to a fresh chat when history is missing or unauthorised', () => {
    expect(forgetAfterHistory(404)).toBe(true);
    expect(forgetAfterHistory(401)).toBe(true);
    expect(forgetAfterHistory(400)).toBe(false);
  });
});

describe('serverErrorMessage', () => {
  it('prefers the Python detail, then the Express error', () => {
    expect(serverErrorMessage({ detail: 'Daily limit reached' })).toBe('Daily limit reached');
    expect(serverErrorMessage({ error: 'Too many requests' })).toBe('Too many requests');
    expect(serverErrorMessage({ message: 'Nope' })).toBe('Nope');
  });

  it('returns null when there is nothing worth showing', () => {
    expect(serverErrorMessage({ detail: '   ' })).toBeNull();
    expect(serverErrorMessage({ detail: 42 })).toBeNull();
    expect(serverErrorMessage(undefined)).toBeNull();
  });
});

describe('unread badge', () => {
  const welcome = welcomeMessage(NOW);
  const question = userMessage('Do I need to fast?', 'u1', NOW);
  const reply = mapChatReply({ message_id: 'r1', content: 'Yes, 10 hours.' }, 'r1', NOW);

  it('ignores the welcome line and a question the person just typed', () => {
    expect(unreadReplyId([welcome])).toBeNull();
    expect(unreadReplyId([welcome, question])).toBeNull();
    expect(welcome.id).toBe(WELCOME_ID);
  });

  it('marks a reply that arrived while the chat was closed', () => {
    expect(hasUnread([welcome, question, reply], null, false)).toBe(true);
  });

  it('clears once that reply has been seen, and never shows while open', () => {
    expect(hasUnread([welcome, question, reply], 'r1', false)).toBe(false);
    expect(hasUnread([welcome, question, reply], null, true)).toBe(false);
  });
});
