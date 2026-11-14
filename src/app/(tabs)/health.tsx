import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Space, Type } from '@/constants/theme';

const LINKS = [
    { label: 'Lab bookings', hint: 'Track, reschedule or cancel a sample collection', href: '/lab/bookings' as const },
    { label: 'Reports', hint: 'View your lab reports', href: '/lab/reports' as const },
    { label: 'My consultations', hint: 'Your doctor appointments', href: '/consult/my' as const },
];

export default function HealthScreen() {
    return (
        <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
            <Text style={styles.intro}>Everything you have booked with DocNow.</Text>
            {LINKS.map((link) => (
                <Pressable
                    key={link.href}
                    style={styles.row}
                    onPress={() => router.push(link.href)}
                    accessibilityRole="button"
                    accessibilityLabel={`${link.label}. ${link.hint}`}>
                    <View style={styles.rowText}>
                        <Text style={styles.label}>{link.label}</Text>
                        <Text style={styles.hint}>{link.hint}</Text>
                    </View>
                </Pressable>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: Colors.surface },
    content: { padding: Space[4], gap: Space[3] },
    intro: { ...Type.body, color: Colors.inkMuted },
    row: { minHeight: 44, justifyContent: 'center', padding: Space[4], borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
    rowText: { gap: 2 },
    label: { ...Type.bodyStrong, color: Colors.ink },
    hint: { ...Type.small, color: Colors.inkMuted },
});
