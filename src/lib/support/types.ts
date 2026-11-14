/** Mirrors the website's useSupportChat types so both clients read the same AI replies. */

export interface ChatSource {
  title: string;
  url?: string;
  type?: string;
}

/** A catalog test the bot found; built by the server from catalog rows, never from the reply text. */
export interface ChatProductCard {
  code: string;
  name: string;
  type: string;
  price: number;
  mrp: number | null;
  sampleType: string | null;
  reportTime: string | null;
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  sources: ChatSource[];
  actions: string[];
  cards: ChatProductCard[];
  verified: boolean;
  wasAbstained: boolean;
  feedbackScore?: number;
  createdAt: string;
}
