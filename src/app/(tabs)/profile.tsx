import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ListRow, SectionTitle } from '@/components/account/ui';
import { Notice } from '@/components/doctor/ui';
import { Colors, Radius, Space, Type } from '@/constants/theme';
import { useDoctorMe } from '@/hooks/use-doctor-me';
import { account } from '@/lib/account/api';
import { profileDetailLine, profileHeading } from '@/lib/account/profile-forms';
import { walletBalanceText } from '@/lib/account/wallet';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/consult/api';

export default function ProfileScreen() {
  const { user, signOut, signOutEverywhere } = useAuth();
  const [leaving, setLeaving] = useState<'none' | 'device' | 'all'>('none');
  const [problem, setProblem] = useState('');
  const doctor = useDoctorMe();
  // No application yet is a loaded, empty answer. Anything else opens the Doctor area.
  const doctorLabel = doctor.isSuccess && doctor.data === null ? 'Join as a doctor' : 'Doctor area';

  const profile = useQuery({ queryKey: ['account', 'profile'], queryFn: account.profile });
  const balance = profile.data?.wallet?.balance;

  const leave = (scope: 'device' | 'all') => {
    setProblem('');
    setLeaving(scope);
    const work = scope === 'all' ? signOutEverywhere() : signOut();
    void work
      .catch((e) => setProblem(friendlyError(e, 'Could not log out. Please try again.')))
      .finally(() => setLeaving('none'));
  };

  const confirmLeaveAll = () =>
    Alert.alert('Log out of all devices?', 'Every phone and browser signed in to this account will be logged out.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out everywhere', style: 'destructive', onPress: () => leave('all') },
    ]);

  const busy = leaving !== 'none';

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.wrap}
      refreshControl={
        <RefreshControl
          refreshing={profile.isRefetching}
          onRefresh={() => void profile.refetch()}
          tintColor={Colors.primary}
        />
      }>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.name}>{profileHeading(profile.data, user?.name ?? 'DocNow user')}</Text>
          <Text style={styles.mobile}>{profile.data?.mobile ?? user?.mobile}</Text>
          {profileDetailLine(profile.data) ? (
            <Text style={styles.detail}>{profileDetailLine(profile.data)}</Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => router.push('/account/edit')}
          accessibilityRole="button"
          accessibilityLabel="Edit your profile"
          style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
      </View>

      {problem ? <Notice tone="error">{problem}</Notice> : null}

      <SectionTitle>Your care</SectionTitle>
      <ListRow title="My consultations" onPress={() => router.push('/consult/my')} />
      <ListRow title="Lab bookings" onPress={() => router.push('/lab/bookings')} />
      <ListRow title="Reports" onPress={() => router.push('/lab/reports')} />

      <SectionTitle>Your details</SectionTitle>
      <ListRow
        title="Family members"
        note="The people you book for"
        onPress={() => router.push('/account/family')}
      />
      <ListRow
        title="Addresses"
        note="Where the sample collector comes"
        onPress={() => router.push('/account/addresses')}
      />
      <ListRow title="Edit profile" onPress={() => router.push('/account/edit')} />
      <ListRow title="Change password" onPress={() => router.push('/account/password')} />

      <SectionTitle>Money and rewards</SectionTitle>
      <ListRow
        title="Wallet"
        note="Balance and history"
        value={balance === undefined ? undefined : walletBalanceText(balance)}
        onPress={() => router.push('/account/wallet')}
      />
      <ListRow
        title="Refer and earn"
        note="Share your code with friends"
        onPress={() => router.push('/account/referrals')}
      />

      <SectionTitle>More</SectionTitle>
      <ListRow
        title="Health camps"
        note="Walk-in health checkups near you"
        onPress={() => router.push('/camps')}
      />
      <ListRow title="Help and support" onPress={() => router.push('/info/help')} />
      <ListRow title="About DocNow" onPress={() => router.push('/info/about')} />
      <ListRow title={doctorLabel} onPress={() => router.push('/doctor')} />

      {/* Logout waits for the server to end the session, which can take a while on a slow network. */}
      <Pressable
        style={[styles.button, busy && styles.busy]}
        disabled={busy}
        onPress={() => leave('device')}
        accessibilityRole="button"
        accessibilityLabel={leaving === 'device' ? 'Logging out' : 'Log out'}
        accessibilityState={{ disabled: busy, busy: leaving === 'device' }}>
        <Text style={styles.buttonText}>{leaving === 'device' ? 'Logging out...' : 'Log out'}</Text>
      </Pressable>
      <Pressable
        style={[styles.danger, busy && styles.busy]}
        disabled={busy}
        onPress={confirmLeaveAll}
        accessibilityRole="button"
        accessibilityLabel={leaving === 'all' ? 'Logging out of all devices' : 'Log out of all devices'}
        accessibilityState={{ disabled: busy, busy: leaving === 'all' }}>
        <Text style={styles.dangerText}>
          {leaving === 'all' ? 'Logging out everywhere...' : 'Log out of all devices'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.surfaceSubtle },
  wrap: { padding: Space[4], gap: Space[2], paddingBottom: Space[8] },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space[3],
    padding: Space[4],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerText: { flex: 1, gap: 2 },
  name: { ...Type.titleSm, color: Colors.ink },
  mobile: { ...Type.small, color: Colors.inkMuted },
  detail: { ...Type.small, color: Colors.inkMuted },
  editButton: {
    minHeight: 44,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space[3],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  pressed: { backgroundColor: Colors.primarySoft },
  editText: { ...Type.bodyStrong, color: Colors.primary },
  button: {
    minHeight: 44,
    marginTop: Space[4],
    justifyContent: 'center',
    alignItems: 'center',
    padding: Space[4],
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
  },
  buttonText: { ...Type.bodyStrong, color: Colors.primary },
  danger: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Space[4],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  dangerText: { ...Type.bodyStrong, color: Colors.dangerInk },
  busy: { opacity: 0.6 },
});
