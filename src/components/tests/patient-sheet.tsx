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
import { patientsApi } from '@/lib/tests/api';
import type { Patient } from '@/lib/tests/types';

const RELATIONS = ['Self', 'Spouse', 'Child', 'Parent', 'Other'];
const GENDERS = ['Male', 'Female', 'Other'];

interface Props {
  visible: boolean;
  selectedId?: string | null;
  onSelect: (patient: Patient) => void;
  onClose: () => void;
}

export function PatientSheet({ visible, selectedId, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('Self');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [saving, setSaving] = useState(false);

  const resetForm = React.useCallback(() => {
    setName('');
    setRelation('Other');
    setAge('');
    setGender('Male');
    setEditingId(null);
  }, []);

  const fetchPatients = React.useCallback(async () => {
    try {
      setLoading(true);
      const list = await patientsApi.list();
      setPatients(list);
    } catch {
      Alert.alert('Error', 'Unable to fetch family members');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    patientsApi
      .list()
      .then((list) => {
        if (!cancelled) {
          setPatients(list);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, resetForm]);

  const handleStartAdd = () => {
    resetForm();
    setIsEditing(true);
  };

  const handleStartEdit = (p: Patient) => {
    setName(p.name);
    setRelation(p.relation);
    setAge(p.age.toString());
    setGender(p.gender);
    setEditingId(p.id);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a name');
      return;
    }
    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 120) {
      Alert.alert('Invalid Age', 'Please enter a valid age between 1 and 120');
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await patientsApi.update(editingId, {
          name: name.trim(),
          relation,
          age: parsedAge,
          gender,
        });
      } else {
        await patientsApi.add({
          name: name.trim(),
          relation,
          age: parsedAge,
          gender,
        });
      }
      setIsEditing(false);
      resetForm();
      await fetchPatients();
    } catch (err: any) {
      Alert.alert('Save Failed', err?.response?.data?.message || err?.message || 'Could not save member details');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (p: Patient) => {
    if (p.relation.toLowerCase() === 'self') {
      Alert.alert('Cannot Delete', 'Primary account holder cannot be removed');
      return;
    }

    Alert.alert('Delete Member', `Remove ${p.name} from your profile?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await patientsApi.delete(p.id);
            await fetchPatients();
          } catch (err: any) {
            Alert.alert(
              'Cannot Delete',
              err?.response?.data?.message || 'This member has existing bookings or tests assigned.',
            );
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
            <Text style={styles.title}>{isEditing ? (editingId ? 'Edit Member' : 'Add Family Member') : 'Select Patient'}</Text>
            <Pressable onPress={isEditing ? () => setIsEditing(false) : onClose} hitSlop={10}>
              <Text style={styles.closeBtn}>{isEditing ? 'Back' : 'Done'}</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          ) : isEditing ? (
            <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor={Colors.mutedForeground}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Relationship</Text>
              <View style={styles.pillRow}>
                {RELATIONS.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setRelation(r)}
                    style={[styles.pill, relation === r && styles.pillActive]}>
                    <Text style={[styles.pillText, relation === r && styles.pillTextActive]}>{r}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Age (Years)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 45"
                    placeholderTextColor={Colors.mutedForeground}
                    keyboardType="number-pad"
                    value={age}
                    onChangeText={setAge}
                  />
                </View>
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.label}>Gender</Text>
                  <View style={styles.genderRow}>
                    {GENDERS.map((g) => (
                      <Pressable
                        key={g}
                        onPress={() => setGender(g)}
                        style={[styles.genderPill, gender === g && styles.pillActive]}>
                        <Text style={[styles.pillText, gender === g && styles.pillTextActive]}>{g}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              <Pressable
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                disabled={saving}
                onPress={handleSave}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{editingId ? 'Update Member' : 'Save Member'}</Text>
                )}
              </Pressable>
            </ScrollView>
          ) : (
            <ScrollView style={styles.listScroll}>
              {patients.map((p) => {
                const isSelected = p.id === selectedId;
                return (
                  <View
                    key={p.id}
                    style={[styles.patientCard, isSelected && styles.patientCardSelected]}>
                    <Pressable
                      style={styles.patientInfo}
                      onPress={() => {
                        onSelect(p);
                        onClose();
                      }}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{p.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.patientName}>{p.name}</Text>
                        <Text style={styles.patientSub}>
                          {p.relation} • {p.age} yrs • {p.gender}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={styles.checkBadge}>
                          <Text style={styles.checkText}>✓</Text>
                        </View>
                      )}
                    </Pressable>

                    <View style={styles.cardActions}>
                      <Pressable onPress={() => handleStartEdit(p)} hitSlop={8}>
                        <Text style={styles.actionLink}>Edit</Text>
                      </Pressable>
                      {p.relation.toLowerCase() !== 'self' && (
                        <Pressable onPress={() => handleDelete(p)} hitSlop={8}>
                          <Text style={[styles.actionLink, { color: Colors.destructive }]}>Delete</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}

              <Pressable style={styles.addMemberBtn} onPress={handleStartAdd}>
                <Text style={styles.addMemberText}>+ Add New Family Member</Text>
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
  patientCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 12,
  },
  patientCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryTint,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
  },
  patientSub: {
    fontSize: 13,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  actionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  addMemberBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  addMemberText: {
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  pillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  pillText: {
    fontSize: 13,
    color: Colors.foreground,
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 6,
  },
  genderPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.card,
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
