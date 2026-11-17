import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { catalog, MAX_TESTS, toggleTestCode } from '@/lib/consult/api';

interface Props {
  selectedCodes: string[];
  onChange: (codes: string[]) => void;
  /** Names for codes already on the prescription (corrections), so chips don't show bare codes. */
  knownNames?: Record<string, string>;
}

/** Catalog test picker. The list stays open so the doctor can tick several tests in a row. */
export function TestPicker({ selectedCodes, onChange, knownNames }: Props) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [names, setNames] = useState<Record<string, string>>(knownNames ?? {});
  const full = selectedCodes.length >= MAX_TESTS;

  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), query.trim() ? 300 : 0);
    return () => clearTimeout(t);
  }, [query]);

  const tests = useQuery({
    queryKey: ['catalog-tests', search],
    queryFn: () => catalog.tests(search),
    enabled: open && search.length !== 1,
    staleTime: 5 * 60_000,
  });

  const toggle = (code: string, name: string) => {
    setNames((n) => ({ ...n, [code]: name }));
    onChange(toggleTestCode(selectedCodes, code));
  };

  return (
    <View style={styles.wrap}>
      {selectedCodes.length > 0 ? (
        <View style={styles.chips}>
          {selectedCodes.map((code) => (
            <Pressable key={code} style={styles.chip} onPress={() => onChange(toggleTestCode(selectedCodes, code))}
              accessibilityRole="button" accessibilityLabel={`Remove ${names[code] ?? code}`}>
              <Text style={styles.chipText}>{names[code] ?? code}  ✕</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={(v) => {
          setQuery(v);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Tap to pick tests, or search (CBC, TSH)"
        placeholderTextColor={Colors.mutedForeground}
        accessibilityLabel="Search tests"
      />
      {open ? (
        <View style={styles.list}>
          {full ? <Text style={styles.cap}>You can add up to {MAX_TESTS} tests.</Text> : null}
          {query.trim().length === 1 ? (
            <Text style={styles.empty}>Type one more letter to search.</Text>
          ) : tests.isError ? (
            <Text style={styles.error} accessibilityRole="alert">Could not load tests. Check your internet and try again.</Text>
          ) : tests.isPending || search !== query.trim() ? (
            <ActivityIndicator style={styles.loading} color={Colors.primary} />
          ) : tests.data.length === 0 ? (
            <Text style={styles.empty}>No tests found. Try the test name or code.</Text>
          ) : (
            // Nested scrolling: the list scrolls on its own inside the consultation screen.
            <ScrollView style={styles.scroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {tests.data.map((t) => {
                const picked = selectedCodes.includes(t.partnerCode);
                return (
                  <Pressable key={t.partnerCode} style={[styles.row, !picked && full && styles.off]} disabled={!picked && full}
                    onPress={() => toggle(t.partnerCode, t.name)}
                    accessibilityRole="checkbox" accessibilityState={{ checked: picked, disabled: !picked && full }} accessibilityLabel={t.name}>
                    <View style={[styles.box, picked && styles.boxOn]}>{picked ? <Text style={styles.tick}>✓</Text> : null}</View>
                    <View style={styles.rowText}>
                      <Text style={styles.name} numberOfLines={1}>{t.name}</Text>
                      <Text style={styles.code}>{t.partnerCode}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <View style={styles.footer}>
            <Text style={styles.count}>{selectedCodes.length} of {MAX_TESTS} selected</Text>
            <Pressable onPress={() => { Keyboard.dismiss(); setOpen(false); }} accessibilityRole="button" accessibilityLabel="Done picking tests" hitSlop={8}>
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: '#efe9f8' },
  chipText: { color: Colors.primary, fontWeight: '600' },
  input: { backgroundColor: '#f3f3f5', borderRadius: Radius.xl, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, fontSize: 16, color: Colors.foreground },
  list: { borderWidth: 1, borderColor: Colors.muted, borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: Colors.background },
  scroll: { maxHeight: 300 },
  cap: { padding: 10, backgroundColor: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: '600' },
  empty: { padding: 16, textAlign: 'center', color: Colors.mutedForeground },
  error: { padding: 16, textAlign: 'center', color: Colors.destructive },
  loading: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.muted },
  off: { opacity: 0.5 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  boxOn: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  tick: { color: Colors.primaryForeground, fontWeight: '800' },
  rowText: { flex: 1 },
  name: { fontWeight: '600', color: Colors.foreground },
  code: { fontSize: 12, color: Colors.mutedForeground },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.muted },
  count: { fontSize: 12, color: Colors.mutedForeground },
  done: { color: Colors.primary, fontWeight: '700' },
});
