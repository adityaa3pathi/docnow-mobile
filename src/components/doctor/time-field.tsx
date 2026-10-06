import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { isoToIstLocal, istLocalToIso } from '@/lib/consult/availability';
import { localToPicker, pickerToLocal, pickerToTime, timeToPicker } from '@/lib/consult/pickerTime';
import { formatIstDateTime } from '@/lib/consult/time';

interface Props {
  label: string;
  /** "HH:mm" in time mode, "YYYY-MM-DDTHH:mm" in datetime mode. Always Indian time. */
  value: string;
  mode: 'time' | 'datetime';
  onChange: (value: string) => void;
}

function shown(value: string, mode: Props['mode']) {
  if (!value) return 'Choose';
  if (mode === 'time') return value;
  const iso = istLocalToIso(value);
  return iso ? formatIstDateTime(iso) : 'Choose';
}

// The picker reports phone-zone fields; we treat them as Indian time (see pickerTime.ts).
function startValue(value: string, mode: Props['mode']): Date {
  if (mode === 'time') return timeToPicker(value);
  return localToPicker(value) ?? localToPicker(isoToIstLocal(new Date().toISOString())) ?? new Date();
}

export function TimeField({ label, value, mode, onChange }: Props) {
  const current = startValue(value, mode);
  const accept = (e: DateTimePickerEvent, d?: Date) => {
    if (e.type === 'set' && d) onChange(mode === 'time' ? pickerToTime(d) : pickerToLocal(d));
  };

  const openAndroid = () => {
    if (mode === 'time') {
      DateTimePickerAndroid.open({ value: current, mode: 'time', is24Hour: true, onChange: accept });
      return;
    }
    DateTimePickerAndroid.open({
      value: current,
      mode: 'date',
      onChange: (e, date) => {
        if (e.type !== 'set' || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          is24Hour: false,
          onChange: (e2, time) => {
            if (e2.type !== 'set' || !time) return;
            const merged = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes());
            onChange(pickerToLocal(merged));
          },
        });
      },
    });
  };

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.iosRow}>
          <DateTimePicker value={current} mode={mode} display="compact" onChange={accept} accessibilityLabel={label} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={styles.button}
        onPress={openAndroid}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${shown(value, mode)}. Tap to change`}>
        <Text style={styles.value}>{shown(value, mode)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4, flexGrow: 1, flexShrink: 1, minWidth: 110 },
  label: { fontWeight: '600', color: Colors.foreground, fontSize: 13 },
  button: { backgroundColor: '#f3f3f5', borderRadius: Radius.xl, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, justifyContent: 'center' },
  value: { fontSize: 16, color: Colors.foreground },
  iosRow: { alignItems: 'flex-start', minHeight: 48, justifyContent: 'center' },
});
