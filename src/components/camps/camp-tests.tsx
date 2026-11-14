import { StyleSheet, Text, View } from 'react-native';

import { Section } from '@/components/checkout/section';
import { Colors, Space, Type } from '@/constants/theme';
import type { CampItem } from '@/lib/camps';

/** The camp's tests and packages, named exactly as the catalogue names them. */
export function CampTests({ items }: { items: CampItem[] }) {
    return (
        <Section title={`Included Tests & Packages (${items.length})`}>
            {items.length === 0 ? (
                <Text style={styles.muted}>This camp has no tests listed yet.</Text>
            ) : (
                items.map((item) => (
                    <View key={item.id} style={styles.row}>
                        <Text style={styles.name}>{item.catalogItem.name}</Text>
                        <Text style={styles.type}>{item.catalogItem.type}</Text>
                    </View>
                ))
            )}
        </Section>
    );
}

const styles = StyleSheet.create({
    row: { gap: 2, paddingVertical: Space[1] },
    name: { ...Type.small, color: Colors.ink },
    type: { ...Type.small, color: Colors.inkMuted },
    muted: { ...Type.small, color: Colors.inkMuted },
});
