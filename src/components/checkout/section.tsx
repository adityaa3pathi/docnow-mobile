import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';

/** One numbered step of the checkout, as a card. The number matches the website's headings. */
export function Section({ step, title, children }: { step?: number; title: string; children: ReactNode }) {
    return (
        <View style={styles.card}>
            <Text style={styles.title} accessibilityRole="header">
                {step ? `${step}. ${title}` : title}
            </Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: Space[3],
        padding: Space[4],
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    title: { ...Type.bodyLg, fontFamily: Fonts.semibold, color: Colors.ink },
});
