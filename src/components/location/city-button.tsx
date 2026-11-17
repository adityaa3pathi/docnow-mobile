import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { cityButtonLabel } from '@/lib/location/cities';
import { useLocationCity } from '@/lib/location/context';

/** Header button for the Lab Tests tab, matching the website's city box. */
export function CityButton() {
  const { selectedCity } = useLocationCity();
  const label = cityButtonLabel(selectedCity);
  return (
    <Pressable
      onPress={() => router.push('/location/city')}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`City: ${label}. Change city`}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 44, maxWidth: 150, justifyContent: 'center', paddingHorizontal: Space[3], marginLeft: Space[2], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  pressed: { backgroundColor: Colors.primarySoft },
  label: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primary },
});
