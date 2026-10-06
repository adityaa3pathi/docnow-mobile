import { StyleSheet, View } from 'react-native';

import { WeeklyHours } from '@/components/doctor/weekly-hours';
import { Colors } from '@/constants/theme';

export default function HoursScreen() {
  return (
    <View style={styles.flex}>
      <WeeklyHours />
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1, backgroundColor: Colors.background } });
