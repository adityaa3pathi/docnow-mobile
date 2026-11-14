import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import type { InfoBlock, InfoDoc, InfoSection } from '@/lib/info/types';

function Blocks({ blocks }: { blocks: InfoBlock[] }) {
  return (
    <View style={styles.blocks}>
      {blocks.map((block, i) => {
        if (block.type === 'paragraph') {
          return (
            <Text key={i} style={styles.body}>
              {block.text}
            </Text>
          );
        }
        if (block.type === 'note') {
          return (
            <View key={i} style={styles.note}>
              <Text style={styles.noteText}>{block.text}</Text>
            </View>
          );
        }
        return (
          <View key={i} style={styles.list}>
            {block.items.map((item, j) => (
              <View key={j} style={styles.item}>
                <Text style={styles.marker}>•</Text>
                <Text style={[styles.body, styles.itemText]}>{item}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

function Section({ section }: { section: InfoSection }) {
  const heading = section.number ? `${section.number}. ${section.title}` : section.title;
  return (
    <View style={styles.section}>
      {section.title ? (
        <Text style={styles.heading} accessibilityRole="header">
          {heading}
        </Text>
      ) : null}
      <Blocks blocks={section.blocks} />
    </View>
  );
}

/** One scrolling page for the copied-from-the-website documents. */
export function InfoPage({ doc, children }: { doc: InfoDoc; children?: React.ReactNode }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.wrap}>
      <Text style={styles.title} accessibilityRole="header">
        {doc.title}
      </Text>
      {doc.subtitle ? <Text style={styles.subtitle}>{doc.subtitle}</Text> : null}
      {doc.updated ? <Text style={styles.updated}>{doc.updated}</Text> : null}
      {children}
      {doc.sections.map((section, i) => (
        <Section key={i} section={section} />
      ))}
    </ScrollView>
  );
}

/** A tappable contact row; `href` is a tel: or mailto: link. */
export function ContactRow({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <>
      <Text style={styles.contactLabel}>{label}</Text>
      <Text style={[styles.contactValue, href && styles.contactLink]}>{value}</Text>
    </>
  );
  if (!href) {
    return <View style={styles.contact}>{body}</View>;
  }
  return (
    <Pressable
      onPress={() => void Linking.openURL(href).catch(() => {})}
      style={({ pressed }) => [styles.contact, pressed && styles.pressed]}
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${value}`}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  wrap: { padding: Space[4], gap: Space[4], paddingBottom: Space[12] },
  title: { ...Type.title, color: Colors.ink },
  subtitle: { ...Type.body, color: Colors.inkMuted },
  updated: { ...Type.small, color: Colors.inkSubtle },
  section: { gap: Space[2] },
  heading: { ...Type.titleSm, color: Colors.ink, marginTop: Space[2] },
  blocks: { gap: Space[2] },
  body: { ...Type.body, color: Colors.inkMuted },
  list: { gap: Space[1] },
  item: { flexDirection: 'row', gap: Space[2] },
  itemText: { flex: 1 },
  marker: { ...Type.body, color: Colors.primary },
  note: { padding: Space[3], borderRadius: Radius.lg, borderLeftWidth: 3, borderLeftColor: Colors.primary, backgroundColor: Colors.primarySoft },
  noteText: { ...Type.small, color: Colors.ink },
  contact: { minHeight: 44, gap: Space[1], padding: Space[3], borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceSubtle },
  pressed: { backgroundColor: Colors.surfaceMuted },
  contactLabel: { ...Type.small, fontFamily: Fonts.medium, color: Colors.inkMuted },
  contactValue: { ...Type.body, fontFamily: Fonts.semibold, color: Colors.ink },
  contactLink: { color: Colors.primary },
});
