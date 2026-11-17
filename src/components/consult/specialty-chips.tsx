import {
  Activity,
  Baby,
  Bone,
  Brain,
  Droplet,
  Ear,
  Eye,
  HeartPulse,
  LayoutGrid,
  Pill,
  Smile,
  Sparkles,
  Stethoscope,
  Venus,
  Wind,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Type } from '@/constants/theme';
import type { Specialty } from '@/lib/consult/types';
import { hapticImpact, ImpactFeedbackStyle } from '@/lib/haptics';

interface Look {
  Icon: LucideIcon;
  color: string;
  tint: string;
}

const LOOKS: { match: RegExp; look: Look }[] = [
  { match: /cardi|heart/, look: { Icon: HeartPulse, color: Colors.destructive, tint: Colors.destructiveTint } },
  { match: /derma|skin|hair|cosmet/, look: { Icon: Sparkles, color: '#DB2777', tint: '#FCE7F3' } },
  { match: /pa?ediat|child|neonat/, look: { Icon: Baby, color: Colors.blue, tint: Colors.blueTint } },
  { match: /gyn|obst|women/, look: { Icon: Venus, color: '#C026D3', tint: '#FAE8FF' } },
  { match: /ortho|bone|joint|physio/, look: { Icon: Bone, color: Colors.warning, tint: Colors.warningTint } },
  { match: /neuro|psych|mental/, look: { Icon: Brain, color: Colors.primaryLight, tint: Colors.primarySubtle } },
  { match: /ophthal|eye/, look: { Icon: Eye, color: Colors.teal, tint: Colors.tealTint } },
  { match: /\bent\b|ear|nose|throat|otolaryn/, look: { Icon: Ear, color: Colors.amber, tint: Colors.amberTint } },
  { match: /dent|tooth|oral/, look: { Icon: Smile, color: Colors.blue, tint: Colors.blueTint } },
  { match: /diabet|endocr|thyroid/, look: { Icon: Droplet, color: Colors.destructive, tint: Colors.destructiveTint } },
  { match: /pulmo|chest|lung|respir/, look: { Icon: Wind, color: Colors.teal, tint: Colors.tealTint } },
  { match: /gastro|liver|stomach|digest/, look: { Icon: Pill, color: Colors.success, tint: Colors.successTint } },
  { match: /general|physician|family|internal/, look: { Icon: Stethoscope, color: Colors.primary, tint: Colors.primaryTint } },
];

const FALLBACK: Look = { Icon: Activity, color: Colors.primary, tint: Colors.primaryTint };

/** Picks an icon for a specialty from its slug or name; unknown ones get a neutral pulse icon. */
export function specialtyLook(s: Pick<Specialty, 'name' | 'slug'>): Look {
  const key = `${s.slug} ${s.name}`.toLowerCase();
  return LOOKS.find((l) => l.match.test(key))?.look ?? FALLBACK;
}

interface Props {
  specialties: Specialty[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** A leading "All" tile that clears the filter. */
  showAll?: boolean;
}

function Tile({ label, look, active, onPress }: { label: string; look: Look; active: boolean; onPress: () => void }) {
  const { Icon } = look;
  return (
    <Pressable
      onPress={() => {
        hapticImpact(ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${label}`}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      <View style={[styles.iconWrap, { backgroundColor: look.tint }, active && styles.iconActive]}>
        <Icon size={26} color={look.color} strokeWidth={2} />
      </View>
      <Text style={[styles.label, active && styles.labelActive]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Horizontally scrolling specialty tiles; the selected one gets a purple ring. */
export function SpecialtyChips({ specialties, value, onChange, showAll = true }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityLabel="Filter by specialty">
      {showAll ? (
        <Tile key="all" label="All" look={{ Icon: LayoutGrid, color: Colors.primary, tint: Colors.primaryTint }} active={value === null} onPress={() => onChange(null)} />
      ) : null}
      {specialties.map((s) => (
        <Tile key={s.id} label={s.name} look={specialtyLook(s)} active={value === s.id} onPress={() => onChange(s.id)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 12, paddingHorizontal: 16, paddingVertical: 4 },
  tile: { width: 76, alignItems: 'center', gap: 6 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  iconWrap: { width: 60, height: 60, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  iconActive: { borderColor: Colors.primary },
  label: { fontSize: Type.caption, fontWeight: '600', color: Colors.foreground, textAlign: 'center', lineHeight: 15 },
  labelActive: { color: Colors.primary, fontWeight: '800' },
});
