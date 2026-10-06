import { StyleSheet, View } from 'react-native';

import { LeaveList } from '@/components/doctor/leave-list';
import { Colors } from '@/constants/theme';

export default function LeaveScreen() {
  return (
    <View style={styles.flex}>
      <LeaveList />
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1, backgroundColor: Colors.background } });
