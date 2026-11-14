import { Linking, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { parseRichText, type InlineSpan } from '@/lib/support/rich-text';

function Spans({ spans }: { spans: InlineSpan[] }) {
  return (
    <>
      {spans.map((span, i) => (
        <Text
          key={i}
          style={[span.bold && styles.bold, span.italic && styles.italic, span.code && styles.code, span.href && styles.link]}
          onPress={span.href ? () => void Linking.openURL(span.href as string).catch(() => {}) : undefined}
          accessibilityRole={span.href ? 'link' : undefined}>
          {span.text}
        </Text>
      ))}
    </>
  );
}

/** Renders the reply's own words. Markdown markers come off; no wording is added or removed. */
export function RichText({ content }: { content: string }) {
  const blocks = parseRichText(content);
  if (blocks.length === 0) return null;
  return (
    <View style={styles.wrap}>
      {blocks.map((block, i) => {
        if (block.type === 'paragraph') {
          return (
            <Text key={i} style={styles.body}>
              <Spans spans={block.spans} />
            </Text>
          );
        }
        if (block.type === 'bullets') {
          return (
            <View key={i} style={styles.list}>
              {block.items.map((spans, j) => (
                <View key={j} style={styles.item}>
                  <Text style={styles.marker}>•</Text>
                  <Text style={[styles.body, styles.itemText]}>
                    <Spans spans={spans} />
                  </Text>
                </View>
              ))}
            </View>
          );
        }
        return (
          <View key={i} style={styles.list}>
            {block.items.map((item, j) => (
              <View key={j} style={styles.item}>
                <Text style={styles.marker}>{item.num}.</Text>
                <Text style={[styles.body, styles.itemText]}>
                  <Spans spans={item.spans} />
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Space[2] },
  body: { ...Type.small, color: Colors.ink },
  list: { gap: Space[1] },
  item: { flexDirection: 'row', gap: Space[2] },
  itemText: { flex: 1 },
  marker: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primary, minWidth: 16 },
  bold: { fontFamily: Fonts.semibold },
  italic: { fontStyle: 'italic' },
  code: { fontFamily: 'monospace', backgroundColor: Colors.surfaceMuted, borderRadius: Radius.sm },
  link: { color: Colors.primary, textDecorationLine: 'underline' },
});
