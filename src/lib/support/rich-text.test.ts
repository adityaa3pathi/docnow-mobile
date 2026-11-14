import { describe, expect, it } from 'vitest';

import { blocksPlainText, parseInline, parseRichText } from './rich-text';

describe('parseInline', () => {
  it('leaves plain text alone', () => {
    expect(parseInline('Fasting is needed for 10 hours.')).toEqual([{ text: 'Fasting is needed for 10 hours.' }]);
  });

  it('strips the markers and marks the emphasis', () => {
    expect(parseInline('Call **108** now')).toEqual([
      { text: 'Call ' },
      { text: '108', bold: true },
      { text: ' now' },
    ]);
    expect(parseInline('*really* urgent')).toEqual([{ text: 'really', italic: true }, { text: ' urgent' }]);
    expect(parseInline('code `package_94` here')).toEqual([
      { text: 'code ' },
      { text: 'package_94', code: true },
      { text: ' here' },
    ]);
  });

  it('reads a markdown link, a raw URL and an email as tappable', () => {
    expect(parseInline('See [our policy](https://docnow.in/terms) for more')).toEqual([
      { text: 'See ' },
      { text: 'our policy', href: 'https://docnow.in/terms' },
      { text: ' for more' },
    ]);
    expect(parseInline('Visit https://docnow.in today')).toEqual([
      { text: 'Visit ' },
      { text: 'https://docnow.in', href: 'https://docnow.in' },
      { text: ' today' },
    ]);
    expect(parseInline('Mail docnowhealthcare@gmail.com')).toEqual([
      { text: 'Mail ' },
      { text: 'docnowhealthcare@gmail.com', href: 'mailto:docnowhealthcare@gmail.com' },
    ]);
  });

  it('drops no words when several markers appear in one line', () => {
    const spans = parseInline('**Urgent:** call *108* or mail care@docnow.in now');
    expect(spans.map((s) => s.text).join('')).toBe('Urgent: call 108 or mail care@docnow.in now');
  });
});

describe('parseRichText', () => {
  it('returns nothing for empty content', () => {
    expect(parseRichText('')).toEqual([]);
  });

  it('keeps a symptom reply exactly as the bot wrote it', () => {
    const reply =
      'Chest pain with breathlessness can be serious. Please do not book a lab test and wait. Call 108 or go to the nearest emergency room now.';
    const blocks = parseRichText(reply);
    expect(blocks).toEqual([{ type: 'paragraph', spans: [{ text: reply }] }]);
    expect(blocksPlainText(blocks)).toBe(reply);
  });

  it('groups a bullet run, whichever marker the bot used', () => {
    const blocks = parseRichText('Before your test:\n* Fast for 10 hours\n- Drink water\n• Carry an ID');
    expect(blocks).toEqual([
      { type: 'paragraph', spans: [{ text: 'Before your test:' }] },
      {
        type: 'bullets',
        items: [[{ text: 'Fast for 10 hours' }], [{ text: 'Drink water' }], [{ text: 'Carry an ID' }]],
      },
    ]);
  });

  it('groups a numbered run and keeps the numbers the bot gave', () => {
    const blocks = parseRichText('1. Book a slot\n2. Give the sample\n3. Download the report');
    expect(blocks).toEqual([
      {
        type: 'numbers',
        items: [
          { num: '1', spans: [{ text: 'Book a slot' }] },
          { num: '2', spans: [{ text: 'Give the sample' }] },
          { num: '3', spans: [{ text: 'Download the report' }] },
        ],
      },
    ]);
  });

  it('starts a new run when the list kind changes', () => {
    const blocks = parseRichText('* One\n1. Two');
    expect(blocks.map((b) => b.type)).toEqual(['bullets', 'numbers']);
  });

  it('treats a blank line as a break, not as lost text', () => {
    const blocks = parseRichText('* One\n\n* Two');
    expect(blocks.map((b) => b.type)).toEqual(['bullets', 'bullets']);
    expect(blocksPlainText(blocks)).toBe('One\nTwo');
  });

  it('does not mistake italic text at the start of a line for a bullet', () => {
    expect(parseRichText('*urgent*')).toEqual([{ type: 'paragraph', spans: [{ text: 'urgent', italic: true }] }]);
  });

  it('keeps every word of a mixed reply, markers aside', () => {
    const reply = [
      '**Emergency:** these symptoms need care today.',
      '',
      '* Call 108',
      '* Visit the nearest hospital',
      '',
      'This is not a diagnosis. A doctor must examine you.',
    ].join('\n');
    expect(blocksPlainText(parseRichText(reply))).toBe(
      'Emergency: these symptoms need care today.\nCall 108\nVisit the nearest hospital\nThis is not a diagnosis. A doctor must examine you.',
    );
  });

  it('keeps the phone number and units inside a reply intact', () => {
    const reply = 'Your fasting glucose was 118 mg/dL. Call +91 9649089089 to speak to our team.';
    expect(blocksPlainText(parseRichText(reply))).toBe(reply);
  });
});
