import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';

export const SEARCH_PLACEHOLDER = 'Search for tests, packages and more';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function SearchField({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={SEARCH_PLACEHOLDER}
        placeholderTextColor={Colors.inkSubtle}
        accessibilityLabel={SEARCH_PLACEHOLDER}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChange('')} style={styles.clear} accessibilityRole="button" accessibilityLabel="Clear search">
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: Space[2], marginHorizontal: Space[4], paddingLeft: Space[4], paddingRight: Space[2], borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full, backgroundColor: Colors.surface },
  input: { ...Type.body, flex: 1, minHeight: 48, color: Colors.ink },
  clear: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  clearText: { ...Type.small, fontFamily: Fonts.medium, color: Colors.primary },
});
