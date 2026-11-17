import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius } from '@/constants/theme';
import { addressesApi, locationApi } from '@/lib/tests/api';
import type { Address } from '@/lib/tests/types';

interface Props {
  visible: boolean;
  selectedId?: string | null;
  onSelect: (address: Address) => void;
  onClose: () => void;
}

export function AddressSheet({ visible, selectedId, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Form fields
  const [line1, setLine1] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchAddresses = React.useCallback(async () => {
    try {
      setLoading(true);
      const list = await addressesApi.list();
      setAddresses(list.filter((a) => !a.isDeleted));
    } catch {
      Alert.alert('Error', 'Unable to fetch saved addresses');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    addressesApi
      .list()
      .then((list) => {
        if (!cancelled) {
          setAddresses((list || []).filter((a) => !a.isDeleted));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  // Auto-geocode when 6-digit pincode is entered
  const handlePincodeChange = async (val: string) => {
    setPincode(val);
    if (val.trim().length === 6) {
      try {
        setGeocoding(true);
        const geo = await locationApi.geocode(val.trim());
        if (geo?.city) {
          setCity(geo.city);
        }
      } catch {
        // Geocode might fail for unsupported pins; user can still type city manually
      } finally {
        setGeocoding(false);
      }
    }
  };

  const handleSaveAddress = async () => {
    if (!line1.trim() || !pincode.trim() || !city.trim()) {
      Alert.alert('Missing Info', 'Please fill in flat/house address, pincode, and city');
      return;
    }

    if (pincode.trim().length !== 6) {
      Alert.alert('Invalid Pincode', 'Please enter a valid 6-digit postal code');
      return;
    }

    try {
      setSaving(true);
      // Verify serviceability first
      try {
        const serv = await locationApi.serviceability({ zipcode: pincode.trim() });
        if (serv && serv.status === false) {
          Alert.alert('Not Serviceable', 'Sorry, our phlebotomist partners do not yet service this pincode.');
          return;
        }
      } catch {
        // continue if serviceability check returns fallback
      }

      const created = await addressesApi.add({
        line1: line1.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
      });

      await fetchAddresses();
      setIsAdding(false);
      onSelect(created);
      onClose();
    } catch (err: any) {
      Alert.alert('Save Failed', err?.response?.data?.message || err?.message || 'Could not save address');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = (a: Address) => {
    Alert.alert('Delete Address', `Remove this address?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await addressesApi.delete(a.id);
            await fetchAddresses();
          } catch (err: any) {
            Alert.alert('Cannot Delete', err?.response?.data?.message || 'Could not remove address');
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{isAdding ? 'Add Sample Collection Address' : 'Sample Pickup Address'}</Text>
            <Pressable onPress={isAdding ? () => setIsAdding(false) : onClose} hitSlop={10}>
              <Text style={styles.closeBtn}>{isAdding ? 'Back' : 'Done'}</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          ) : isAdding ? (
            <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Pincode (6 digits)</Text>
              <View style={styles.inputWithSpinner}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="e.g. 110001"
                  placeholderTextColor={Colors.mutedForeground}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={pincode}
                  onChangeText={handlePincodeChange}
                />
                {geocoding && <ActivityIndicator color={Colors.primary} style={{ marginLeft: 8 }} />}
              </View>

              <Text style={styles.label}>City / District</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. New Delhi"
                placeholderTextColor={Colors.mutedForeground}
                value={city}
                onChangeText={setCity}
              />

              <Text style={styles.label}>Flat / House No. / Building / Street</Text>
              <TextInput
                style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
                placeholder="e.g. Flat 302, Tower B, Lotus Apartments, Sector 45"
                placeholderTextColor={Colors.mutedForeground}
                multiline
                numberOfLines={3}
                value={line1}
                onChangeText={setLine1}
              />

              <Text style={styles.helperNote}>
                Home sample collection will be conducted at this address by Healthians certified technicians.
              </Text>

              <Pressable
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                disabled={saving}
                onPress={handleSaveAddress}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save and Select Address</Text>
                )}
              </Pressable>
            </ScrollView>
          ) : (
            <ScrollView style={styles.listScroll}>
              {addresses.map((a) => {
                const isSelected = a.id === selectedId;
                return (
                  <View key={a.id} style={[styles.card, isSelected && styles.cardSelected]}>
                    <Pressable
                      style={styles.cardInfo}
                      onPress={() => {
                        onSelect(a);
                        onClose();
                      }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.addressLine}>{a.line1}</Text>
                        <Text style={styles.addressSub}>
                          {a.city} — {a.pincode}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={styles.checkBadge}>
                          <Text style={styles.checkText}>✓</Text>
                        </View>
                      )}
                    </Pressable>

                    <View style={styles.cardActions}>
                      <Pressable onPress={() => handleDeleteAddress(a)} hitSlop={8}>
                        <Text style={[styles.actionLink, { color: Colors.destructive }]}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}

              <Pressable style={styles.addBtn} onPress={() => setIsAdding(true)}>
                <Text style={styles.addBtnText}>+ Add New Address</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.foreground,
  },
  closeBtn: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  listScroll: {
    padding: 16,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 12,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryTint,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressLine: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.foreground,
    lineHeight: 21,
  },
  addressSub: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginTop: 3,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  checkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  actionLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  addBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  addBtnText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  formScroll: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.foreground,
    backgroundColor: Colors.cardMuted,
  },
  inputWithSpinner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helperNote: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 10,
    lineHeight: 18,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 30,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
