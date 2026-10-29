import { router } from 'expo-router';
import { Trash } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddressSheet } from '@/components/tests/address-sheet';
import { PatientSheet } from '@/components/tests/patient-sheet';
import { Colors, Radius } from '@/constants/theme';
import { useDoctorMe } from '@/hooks/use-doctor-me';
import { api, errorMessage } from '@/lib/api';
import { DELETE_ACCOUNT_MESSAGE, DELETE_ACCOUNT_TITLE } from '@/lib/account';
import { useAuth } from '@/lib/auth';
import { hapticNotify, NotificationFeedbackType } from '@/lib/haptics';
import { clearPushRegistration } from '@/lib/push-registration';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const doctor = useDoctorMe();
  const doctorLabel = doctor.isSuccess && doctor.data === null ? 'Join as a Doctor' : 'Doctor Practice Area';

  const [showPatientSheet, setShowPatientSheet] = useState(false);
  const [showAddressSheet, setShowAddressSheet] = useState(false);

  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    setDeleting(true);
    try {
      await api.delete('/api/profile');
      hapticNotify(NotificationFeedbackType.Success);
      // The server already dropped this phone's push token; skip the call that would now be refused.
      await clearPushRegistration();
      // Signing out clears the saved tokens; the auth guard then shows the login screen.
      await signOut();
    } catch (e) {
      setDeleting(false);
      hapticNotify(NotificationFeedbackType.Error);
      Alert.alert('Account not deleted', errorMessage(e, 'We could not delete your account. Please try again.'));
    }
  }

  const handleDeleteAccount = () => {
    Alert.alert(DELETE_ACCOUNT_TITLE, DELETE_ACCOUNT_MESSAGE, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete My Account', style: 'destructive', onPress: () => void deleteAccount() },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of DocNow?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account & Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* User Identity Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name || user?.mobile || 'D').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.name || 'DocNow Patient'}</Text>
            <Text style={styles.userMobile}>+91 {user?.mobile}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role || 'VERIFIED USER'}</Text>
            </View>
          </View>
        </View>

        {/* Section 1: Family & Addresses */}
        <Text style={styles.sectionHeading}>FAMILY & PREFERENCES</Text>
        <View style={styles.menuGroup}>
          <Pressable
            style={styles.menuItem}
            onPress={() => setShowPatientSheet(true)}>
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>👨‍👩‍👧‍👦</Text>
              <View>
                <Text style={styles.menuTitle}>Manage Family Members</Text>
                <Text style={styles.menuSub}>Add, edit, or remove patient profiles</Text>
              </View>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => setShowAddressSheet(true)}>
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>📍</Text>
              <View>
                <Text style={styles.menuTitle}>Saved Pickup Addresses</Text>
                <Text style={styles.menuSub}>Manage home sample collection locations</Text>
              </View>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </Pressable>
        </View>

        {/* Section 2: Bookings & Activity */}
        <Text style={styles.sectionHeading}>YOUR HEALTH ACTIVITY</Text>
        <View style={styles.menuGroup}>
          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/consult/my')}>
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>🩺</Text>
              <View>
                <Text style={styles.menuTitle}>Doctor Consultations</Text>
                <Text style={styles.menuSub}>Upcoming appointments & video rooms</Text>
              </View>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/tests/bookings')}>
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>🧪</Text>
              <View>
                <Text style={styles.menuTitle}>Diagnostic Test Bookings</Text>
                <Text style={styles.menuSub}>Phlebotomist tracking & lab reports</Text>
              </View>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </Pressable>
        </View>

        {/* Section 3: For Practitioners */}
        <Text style={styles.sectionHeading}>FOR PRACTITIONERS</Text>
        <View style={styles.menuGroup}>
          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/doctor' as any)}>
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>👨‍⚕️</Text>
              <View>
                <Text style={styles.menuTitle}>{doctorLabel}</Text>
                <Text style={styles.menuSub}>Manage practice hours, leaves & consultations</Text>
              </View>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </Pressable>
        </View>

        {/* Section 4: Trust & Compliance */}
        <Text style={styles.sectionHeading}>SECURITY & COMPLIANCE</Text>
        <View style={styles.menuGroup}>
          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>🔒</Text>
              <View>
                <Text style={styles.menuTitle}>DPDP Act Compliant</Text>
                <Text style={styles.menuSub}>256-bit encrypted health records & video consultations</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <Pressable style={styles.logoutBtn} onPress={handleSignOut}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </Pressable>

        {/* Danger zone: in-app account deletion (App Store 5.1.1(v)) */}
        <Text style={styles.sectionHeading}>DANGER ZONE</Text>
        <View style={[styles.menuGroup, styles.dangerGroup]}>
          <Pressable
            testID="delete-account"
            style={[styles.menuItem, styles.dangerItem]}
            onPress={handleDeleteAccount}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityState={{ disabled: deleting, busy: deleting }}>
            <View style={styles.menuLeft}>
              <Trash size={20} color={Colors.destructive} />
              <View style={styles.flex}>
                <Text style={styles.dangerTitle}>Delete Account</Text>
                <Text style={styles.menuSub}>Permanently close your DocNow account</Text>
              </View>
            </View>
            {deleting ? <ActivityIndicator color={Colors.destructive} /> : null}
          </Pressable>
        </View>

        <Text style={styles.appVersion}>DocNow Mobile • Version 1.0.0 (SDK 58)</Text>
      </ScrollView>

      {/* Patient Sheet */}
      <PatientSheet
        visible={showPatientSheet}
        onSelect={() => setShowPatientSheet(false)}
        onClose={() => setShowPatientSheet(false)}
      />

      {/* Address Sheet */}
      <AddressSheet
        visible={showAddressSheet}
        onSelect={() => setShowAddressSheet(false)}
        onClose={() => setShowAddressSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.foreground,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: 2,
  },
  userMobile: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.mutedForeground,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  menuIcon: {
    fontSize: 22,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 2,
  },
  menuSub: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  menuChevron: {
    fontSize: 20,
    color: Colors.mutedForeground,
    marginLeft: 8,
  },
  logoutBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.destructive,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  logoutBtnText: {
    color: Colors.destructive,
    fontSize: 15,
    fontWeight: '700',
  },
  flex: {
    flex: 1,
  },
  dangerGroup: {
    borderColor: Colors.destructiveTint,
  },
  dangerItem: {
    borderBottomWidth: 0,
    minHeight: 56,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.destructive,
    marginBottom: 2,
  },
  appVersion: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.mutedForeground,
  },
});
