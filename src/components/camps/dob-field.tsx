import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Space, Type } from '@/constants/theme';
import { dobKey, formatDob, parseDobKey } from '@/lib/camps';

interface Props {
    /** "YYYY-MM-DD", or empty when nothing has been chosen yet. */
    value: string;
    onChange: (value: string) => void;
    /** Filled in from the saved patient, which the website says out loud too. */
    autoFilled?: boolean;
}

/** The camp's date of birth question. The picker cannot offer a future date. */
export function DobField({ value, onChange, autoFilled }: Props) {
    const today = new Date();
    const current = parseDobKey(value) ?? new Date(today.getFullYear() - 30, 0, 1);
    const shown = value ? formatDob(value) : 'Choose a date';

    const accept = (event: DateTimePickerEvent, picked?: Date) => {
        if (event.type === 'set' && picked) onChange(dobKey(picked));
    };

    return (
        <View style={styles.wrap}>
            <Text style={styles.label}>Date of Birth</Text>
            {Platform.OS === 'ios' ? (
                <View style={styles.iosRow}>
                    <DateTimePicker
                        value={current}
                        mode="date"
                        display="compact"
                        maximumDate={today}
                        onChange={accept}
                        accessibilityLabel="Date of birth"
                    />
                </View>
            ) : (
                <Pressable
                    onPress={() => DateTimePickerAndroid.open({ value: current, mode: 'date', maximumDate: today, onChange: accept })}
                    accessibilityRole="button"
                    accessibilityLabel={`Date of birth, ${shown}. Tap to change`}
                    style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
                    <Text style={value ? styles.value : styles.placeholder}>{shown}</Text>
                </Pressable>
            )}
            {value && autoFilled ? <Text style={styles.hint}>Auto-filled from patient profile</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { gap: Space[1] },
    label: { ...Type.bodyStrong, color: Colors.ink },
    button: {
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: Space[3],
        borderWidth: 1,
        borderColor: Colors.borderStrong,
        borderRadius: Radius.md,
    },
    pressed: { backgroundColor: Colors.surfaceMuted },
    value: { ...Type.body, color: Colors.ink },
    placeholder: { ...Type.body, color: Colors.inkSubtle },
    iosRow: { alignItems: 'flex-start', minHeight: 44, justifyContent: 'center' },
    hint: { ...Type.small, color: Colors.inkMuted },
});
