import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

const ACCREDITATIONS = [
  { icon: '🏅', title: 'NABL', sub: 'Accredited' },
  { icon: '🌐', title: 'CAP', sub: 'Certified' },
  { icon: '🔬', title: '100%', sub: 'Automated' },
];

interface AccreditationBannerProps {
  /** `compact` renders a single-line strip for tight spots such as sticky bars. */
  variant?: 'default' | 'compact';
  style?: StyleProp<ViewStyle>;
}

export function AccreditationBanner({ variant = 'default', style }: AccreditationBannerProps) {
  if (variant === 'compact') {
    return (
      <View
        style={[styles.compactRow, style]}
        accessible
        accessibilityLabel="NABL accredited, CAP certified labs with 100% automated analyzers">
        <Text style={styles.compactText}>✓ NABL Accredited</Text>
        <Text style={styles.compactDot}>•</Text>
        <Text style={styles.compactText}>✓ CAP Certified</Text>
        <Text style={styles.compactDot}>•</Text>
        <Text style={styles.compactText}>✓ Automated Analyzers</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.banner, style]}
      accessible
      accessibilityLabel="NABL accredited, CAP certified labs with 100% automated analyzers">
      {ACCREDITATIONS.map((a, i) => (
        <React.Fragment key={a.title}>
          {i > 0 && <View style={styles.separator} />}
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>{a.icon}</Text>
            <View style={styles.badgeTextWrap}>
              <Text style={styles.badgeTitle}>{a.title}</Text>
              <Text style={styles.badgeSub} numberOfLines={1}>
                {a.sub}
              </Text>
            </View>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const GUARANTEES = [
  {
    icon: '🛡️',
    tint: Colors.primaryTint,
    title: 'Trained & Vaccinated Phlebotomists',
    body: '100% vaccinated staff following strict WHO-compliant safety protocols with sealed, single-use vacutainer needles.',
  },
  {
    icon: '❄️',
    tint: Colors.tealTint,
    title: 'Smart Cold-Chain Tracking',
    body: 'Barcoded tubes transported at 2°C–8°C to protect sample integrity all the way to the lab.',
  },
  {
    icon: '⏱',
    tint: Colors.primaryTint,
    title: 'Guaranteed On-Time Collection',
    body: 'Sample collection is free if your phlebotomist arrives late for your booked slot.',
  },
];

export function PhlebotomistGuaranteeCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Safe Home Collection Promise</Text>
        <View style={styles.verifiedPill}>
          <Text style={styles.verifiedText}>✓ DocNow Assured</Text>
        </View>
      </View>

      {GUARANTEES.map((g, i) => (
        <View key={g.title} style={[styles.guaranteeRow, i > 0 && styles.guaranteeRowBorder]}>
          <View style={[styles.iconTile, { backgroundColor: g.tint }]}>
            <Text style={styles.iconText}>{g.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.guaranteeTitle}>{g.title}</Text>
            <Text style={styles.guaranteeBody}>{g.body}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryTint,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.primarySubtle,
  },
  badge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  badgeIcon: {
    fontSize: 16,
  },
  badgeTextWrap: {
    flexShrink: 1,
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  badgeSub: {
    fontSize: 10,
    color: Colors.mutedForeground,
  },
  separator: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: Colors.primarySubtle,
    marginHorizontal: 4,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  compactText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.teal,
  },
  compactDot: {
    fontSize: 11,
    color: Colors.mutedForeground,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primarySubtle,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    flexShrink: 1,
  },
  verifiedPill: {
    backgroundColor: Colors.tealTint,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.teal,
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  guaranteeRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  guaranteeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.foreground,
  },
  guaranteeBody: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
    lineHeight: 17,
  },
});
