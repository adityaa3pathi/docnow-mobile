import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { ActionButton, Notice } from '@/components/doctor/ui';
import { Colors, Radius, Space, Type } from '@/constants/theme';
import { friendlyError } from '@/lib/consult/api';
import { lab } from '@/lib/lab/api';
import type { PhleboContact } from '@/lib/lab/types';

/**
 * The lab partner only shares a masked number while the collector is on the way, so the details are
 * fetched when asked for rather than with the booking.
 */
export function CollectorCard({ bookingId, canCall }: { bookingId: string; canCall: boolean }) {
    const [contact, setContact] = useState<PhleboContact | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function load() {
        setBusy(true);
        setError(null);
        try {
            setContact(await lab.phlebo(bookingId));
        } catch (e) {
            setError(friendlyError(e, 'Collector details are not available yet.'));
        } finally {
            setBusy(false);
        }
    }

    return (
        <View style={styles.card}>
            <Text style={styles.heading} accessibilityRole="header">Sample collector</Text>
            {contact ? (
                <>
                    <Text style={styles.name}>{contact.phlebo_name}</Text>
                    {canCall ? (
                        <>
                            <Text style={styles.muted}>{contact.masked_number}</Text>
                            <ActionButton
                                label={`Call ${contact.phlebo_name}`}
                                variant="soft"
                                onPress={() => void Linking.openURL(`tel:${contact.masked_number}`)}
                            />
                        </>
                    ) : (
                        <Text style={styles.muted}>Calling closes once your sample has been collected.</Text>
                    )}
                </>
            ) : (
                <>
                    <Text style={styles.muted}>
                        {canCall
                            ? 'A collector is assigned to this booking.'
                            : 'Calling closes once your sample has been collected.'}
                    </Text>
                    {canCall ? (
                        <ActionButton label="Get collector details" busyLabel="Checking..." variant="soft" busy={busy} onPress={load} />
                    ) : null}
                </>
            )}
            {error ? <Notice tone="error">{error}</Notice> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    card: { gap: Space[2], padding: Space[4], borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
    heading: { ...Type.bodyStrong, color: Colors.ink },
    name: { ...Type.body, color: Colors.ink },
    muted: { ...Type.small, color: Colors.inkMuted, fontVariant: ['tabular-nums'] },
});
