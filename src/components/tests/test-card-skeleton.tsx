import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius } from '@/constants/theme';

const MIN_OPACITY = 0.35;
const MAX_OPACITY = 0.75;
const PULSE_MS = 750;

// One shared opacity value per skeleton so every bone pulses in sync.
const PulseContext = createContext<Animated.Value | null>(null);

function Pulse({ children }: { children: React.ReactNode }) {
  const [opacity] = useState(() => new Animated.Value(MIN_OPACITY));

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduceMotion) => {
        if (cancelled) return;
        if (reduceMotion) {
          opacity.setValue((MIN_OPACITY + MAX_OPACITY) / 2);
          return;
        }
        const timing = (toValue: number) =>
          Animated.timing(opacity, {
            toValue,
            duration: PULSE_MS,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          });
        loop = Animated.loop(Animated.sequence([timing(MAX_OPACITY), timing(MIN_OPACITY)]));
        loop.start();
      });

    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [opacity]);

  return <PulseContext.Provider value={opacity}>{children}</PulseContext.Provider>;
}

interface BoneProps {
  width?: DimensionValue;
  height: number;
  radius?: number;
  tone?: 'muted' | 'subtle';
  style?: StyleProp<ViewStyle>;
}

function Bone({ width = '100%', height, radius = Radius.xs, tone = 'muted', style }: BoneProps) {
  const opacity = useContext(PulseContext) ?? MAX_OPACITY;
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: tone === 'muted' ? Colors.muted : Colors.cardMuted,
          opacity,
        },
        style,
      ]}
    />
  );
}

const a11yProps = {
  accessible: true,
  accessibilityRole: 'progressbar' as const,
  accessibilityState: { busy: true },
};

/** Mirrors the product card in tests/explore.tsx. */
export function TestCardSkeleton() {
  return (
    <Pulse>
      <View style={styles.card} {...a11yProps} accessibilityLabel="Loading lab test">
        <View style={styles.row}>
          <Bone width={58} height={18} />
          <Bone width={76} height={18} />
        </View>
        <Bone width="88%" height={16} style={styles.mt10} />
        <Bone width="62%" height={16} style={styles.mt6} />
        <Bone width="95%" height={12} tone="subtle" style={styles.mt10} />
        <View style={[styles.row, styles.mt10, { gap: 16 }]}>
          <Bone width={84} height={12} tone="subtle" />
          <Bone width={72} height={12} tone="subtle" />
        </View>
        <View style={styles.cardFooter}>
          <Bone width={72} height={22} />
          <Bone width={72} height={34} radius={Radius.md} />
        </View>
      </View>
    </Pulse>
  );
}

/** Mirrors the header, price card, info grid, parameters and sticky bar in tests/[code].tsx. */
export function TestDetailSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <Pulse>
      <View
        style={[styles.screen, { paddingTop: insets.top }]}
        {...a11yProps}
        accessibilityLabel="Loading test details">
        <View style={styles.header}>
          <Bone width={28} height={28} radius={Radius.full} />
          <Bone width="50%" height={16} />
          <Bone width={28} height={28} radius={Radius.full} />
        </View>

        <View style={styles.detailBody}>
          <View style={styles.row}>
            <Bone width={64} height={20} />
            <Bone width={170} height={20} />
          </View>
          <Bone width="92%" height={22} style={styles.mt12} />
          <Bone width="58%" height={22} style={styles.mt6} />
          <Bone width="100%" height={13} tone="subtle" style={styles.mt12} />
          <Bone width="80%" height={13} tone="subtle" style={styles.mt6} />

          <View style={styles.panel}>
            <View style={[styles.row, { alignItems: 'flex-end' }]}>
              <Bone width={96} height={26} />
              <Bone width={56} height={16} tone="subtle" />
            </View>
            <Bone width={130} height={12} style={styles.mt6} />
            <View style={styles.divider} />
            <Bone width="85%" height={12} tone="subtle" />
          </View>

          <View style={[styles.row, styles.mt16, { gap: 10 }]}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.infoCard}>
                <Bone width={24} height={24} radius={Radius.full} />
                <Bone width="70%" height={10} tone="subtle" style={styles.mt6} />
                <Bone width="80%" height={13} style={styles.mt6} />
              </View>
            ))}
          </View>

          <Bone width={160} height={16} style={styles.mt20} />
          <View style={[styles.panel, { marginTop: 10 }]}>
            {['95%', '88%', '92%', '60%'].map((w, i) => (
              <Bone key={i} width={w as DimensionValue} height={13} tone="subtle" style={i > 0 && styles.mt8} />
            ))}
          </View>
        </View>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View>
            <Bone width={60} height={10} tone="subtle" />
            <Bone width={84} height={22} style={styles.mt6} />
          </View>
          <Bone width={140} height={44} radius={Radius.md} />
        </View>
      </View>
    </Pulse>
  );
}

/** Mirrors the cart item cards and bill summary in (tabs)/tests.tsx. */
export function CartItemSkeleton({ count = 2 }: { count?: number }) {
  return (
    <Pulse>
      <View style={styles.listPad} {...a11yProps} accessibilityLabel="Loading cart">
        <Bone width="100%" height={42} radius={Radius.md} tone="subtle" style={{ marginBottom: 12 }} />

        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={styles.card}>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <View style={{ flex: 1 }}>
                <Bone width="80%" height={15} />
                <Bone width={64} height={16} style={styles.mt8} />
              </View>
              <Bone width={20} height={20} radius={Radius.full} tone="subtle" />
            </View>
            <View style={styles.cartPatientRow}>
              <Bone width="55%" height={12} tone="subtle" />
              <Bone width={52} height={12} tone="subtle" />
            </View>
          </View>
        ))}

        <View style={[styles.card, { marginTop: 8 }]}>
          <Bone width={96} height={15} />
          {[0, 1].map((i) => (
            <View key={i} style={[styles.row, styles.mt12, { justifyContent: 'space-between' }]}>
              <Bone width="45%" height={12} tone="subtle" />
              <Bone width={56} height={12} tone="subtle" />
            </View>
          ))}
          <View style={styles.divider} />
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Bone width="40%" height={15} />
            <Bone width={72} height={18} />
          </View>
          <Bone width="100%" height={38} radius={Radius.md} tone="subtle" style={styles.mt16} />
        </View>
      </View>
    </Pulse>
  );
}

/** Mirrors the 2-column slot grid in slot-picker.tsx. */
export function SlotPillsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Pulse>
      <View {...a11yProps} accessibilityLabel="Loading collection slots">
        <Bone width={190} height={12} tone="subtle" style={{ marginBottom: 10 }} />
        <View style={styles.slotGrid}>
          {Array.from({ length: count }, (_, i) => (
            <Bone key={i} width="48%" height={44} radius={Radius.md} style={styles.slotPill} />
          ))}
        </View>
      </View>
    </Pulse>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mt6: { marginTop: 6 },
  mt8: { marginTop: 8 },
  mt10: { marginTop: 10 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt20: { marginTop: 20 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  detailBody: {
    padding: 16,
  },
  panel: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  infoCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listPad: {
    padding: 16,
  },
  cartPatientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotPill: {
    flexGrow: 1,
  },
});
