import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { Section } from '@/components/checkout/section';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { campAddress, campDateRange, mapLinks, type CampDetail } from '@/lib/camps';

/** Where and when the camp runs, with a handover to the phone's own map app. */
export function CampLocation({ camp }: { camp: CampDetail }) {
    const [failed, setFailed] = useState(false);
    const address = campAddress(camp);

    const open = async () => {
        const links = mapLinks(camp, Platform.OS === 'ios');
        setFailed(false);
        try {
            await Linking.openURL(links.primary);
        } catch {
            // No map app for that scheme: Google Maps on the web opens anywhere.
            try {
                await Linking.openURL(links.fallback);
            } catch {
                setFailed(true);
            }
        }
    };

    return (
        <Section title="Where and when">
            <Text style={styles.strong}>{address}</Text>
            <Text style={styles.row}>{campDateRange(camp.startDate, camp.endDate)}</Text>
            <Text style={styles.muted}>Walk in on any day the camp runs. No home visit, and no slot to book.</Text>
            <View style={styles.actions}>
                <Pressable
                    onPress={() => void open()}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${address} in Maps`}
                    style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
                    <Text style={styles.buttonText}>Open in Maps</Text>
                </Pressable>
            </View>
            {failed ? (
                <Text style={styles.error} accessibilityRole="alert">
                    We could not open a map on this phone. The full address is above.
                </Text>
            ) : null}
        </Section>
    );
}

const styles = StyleSheet.create({
    strong: { ...Type.bodyStrong, color: Colors.ink },
    row: { ...Type.small, color: Colors.ink },
    muted: { ...Type.small, color: Colors.inkMuted },
    actions: { flexDirection: 'row' },
    button: {
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: Space[4],
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    pressed: { backgroundColor: Colors.primarySoft },
    buttonText: { ...Type.bodyStrong, color: Colors.primary },
    error: { ...Type.small, fontFamily: Fonts.medium, color: Colors.dangerInk },
});
