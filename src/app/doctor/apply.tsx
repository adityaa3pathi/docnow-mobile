import { StyleSheet, View } from 'react-native';

import { ApplicationForm } from '@/components/doctor/application-form';
import { PendingScreen, SuspendedScreen } from '@/components/doctor/status-screens';
import { Colors } from '@/constants/theme';
import { useDoctorMe } from '@/hooks/use-doctor-me';
import { doctorScreen } from '@/lib/consult/doctorStatus';

/** Shows the application form, or the pending or suspended notice, from the server's status. */
export default function DoctorApply() {
  const { data, refetch } = useDoctorMe();
  const screen = doctorScreen(data);

  const check = async () => {
    const res = await refetch();
    return !res.error;
  };

  let body = null;
  if (screen === 'pending' && data) body = <PendingScreen doctor={data} onCheck={check} />;
  else if (screen === 'suspended' && data) body = <SuspendedScreen doctor={data} onCheck={check} />;
  else if (screen === 'rejected' && data) body = <ApplicationForm existing={data} />;
  else if (screen === 'apply') body = <ApplicationForm />;
  return <View style={styles.flex}>{body}</View>;
}

const styles = StyleSheet.create({ flex: { flex: 1, backgroundColor: Colors.background } });
