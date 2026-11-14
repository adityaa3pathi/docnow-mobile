import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Space, Type } from '@/constants/theme';
import type { Timeline } from '@/lib/lab/timeline';

/** The collection journey as a vertical list, which reads better on a phone than a stepper. */
export function StatusTimeline({ timeline }: { timeline: Timeline }) {
    const reached = timeline.stages.filter((s) => s.state !== 'upcoming').length;
    const label = timeline.stopped
        ? 'Collection journey stopped'
        : `Collection journey, stage ${reached} of ${timeline.stages.length}`;

    return (
        <View style={styles.wrap} accessibilityLabel={label}>
            {timeline.stages.map((stage) => (
                <View key={stage.key} style={styles.row} accessibilityLabel={`${stage.label}, ${stateWord(stage.state)}`}>
                    <View style={styles.rail}>
                        <View style={[styles.dot, stage.state === 'done' && styles.dotDone, stage.state === 'current' && styles.dotCurrent]} />
                    </View>
                    <Text style={[styles.label, stage.state === 'upcoming' && styles.labelUpcoming]}>{stage.label}</Text>
                </View>
            ))}
        </View>
    );
}

function stateWord(state: 'done' | 'current' | 'upcoming'): string {
    if (state === 'done') return 'done';
    return state === 'current' ? 'in progress' : 'not started yet';
}

const styles = StyleSheet.create({
    wrap: { gap: Space[2] },
    row: { flexDirection: 'row', alignItems: 'center', gap: Space[3], minHeight: 28 },
    rail: { width: 16, alignItems: 'center' },
    dot: { width: 10, height: 10, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface },
    dotDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    dotCurrent: { width: 14, height: 14, backgroundColor: Colors.primarySoft, borderColor: Colors.primary, borderWidth: 3 },
    label: { ...Type.body, flex: 1, color: Colors.ink },
    labelUpcoming: { color: Colors.inkSubtle },
});
