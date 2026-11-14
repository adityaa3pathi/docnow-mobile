// Ported from docnowtesting/client/src/components/support/ChatMessage.tsx, so a reply reads the
// same on both clients. Markers come off and nothing else changes: the bot's own words go through.

export interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  /** Set for links, raw URLs and emails; emails arrive as `mailto:`. */
  href?: string;
}

export type RichBlock =
  | { type: 'paragraph'; spans: InlineSpan[] }
  | { type: 'bullets'; items: InlineSpan[][] }
  | { type: 'numbers'; items: { num: string; spans: InlineSpan[] }[] };

const INLINE =
  /(\*\*(.+?)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s<]+)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;

export function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let rest = text;

  while (rest.length > 0) {
    const match = rest.match(INLINE);
    if (!match) {
      spans.push({ text: rest });
      break;
    }
    const at = match.index ?? 0;
    if (at > 0) spans.push({ text: rest.slice(0, at) });

    if (match[1]) spans.push({ text: match[2], bold: true });
    else if (match[3]) spans.push({ text: match[4], italic: true });
    else if (match[5]) spans.push({ text: match[6], code: true });
    else if (match[7]) spans.push({ text: match[8], href: match[9] });
    else if (match[10]) spans.push({ text: match[10], href: match[10] });
    else if (match[11]) spans.push({ text: match[11], href: `mailto:${match[11]}` });

    rest = rest.slice(at + match[0].length);
  }

  return spans.filter((span) => span.text.length > 0);
}

/** Blocks in reading order: paragraphs, bullet runs and numbered runs, as the website groups them. */
export function parseRichText(content: string): RichBlock[] {
  if (!content) return [];

  const blocks: RichBlock[] = [];
  let bullets: InlineSpan[][] | null = null;
  let numbers: { num: string; spans: InlineSpan[] }[] | null = null;

  const flush = () => {
    if (bullets) blocks.push({ type: 'bullets', items: bullets });
    if (numbers) blocks.push({ type: 'numbers', items: numbers });
    bullets = null;
    numbers = null;
  };

  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }

    const bullet = line.match(/^[*\-•]\s+(.*)$/);
    if (bullet) {
      if (!bullets) {
        flush();
        bullets = [];
      }
      bullets.push(parseInline(bullet[1]));
      continue;
    }

    const numbered = line.match(/^(\d+)\.\s+(.*)$/);
    if (numbered) {
      if (!numbers) {
        flush();
        numbers = [];
      }
      numbers.push({ num: numbered[1], spans: parseInline(numbered[2]) });
      continue;
    }

    flush();
    blocks.push({ type: 'paragraph', spans: parseInline(line) });
  }

  flush();
  return blocks;
}

/** Every word the reader will see, for the test that proves nothing is dropped or reworded. */
export function blocksPlainText(blocks: RichBlock[]): string {
  const join = (spans: InlineSpan[]) => spans.map((s) => s.text).join('');
  return blocks
    .map((block) => {
      if (block.type === 'paragraph') return join(block.spans);
      if (block.type === 'bullets') return block.items.map(join).join('\n');
      return block.items.map((item) => `${item.num}. ${join(item.spans)}`).join('\n');
    })
    .join('\n');
}
