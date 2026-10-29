import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { promosApi } from '@/lib/tests/api';
import type { AvailablePromo, PromoValidationResult } from '@/lib/tests/types';

interface Props {
  cartAmount: number;
  appliedPromo: PromoValidationResult | null;
  onApply: (promo: PromoValidationResult | null) => void;
}

export function PromoSection({ cartAmount, appliedPromo, onApply }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [availablePromos, setAvailablePromos] = useState<AvailablePromo[]>([]);

  useEffect(() => {
    let cancelled = false;
    promosApi
      .available()
      .then((list) => {
        if (!cancelled) setAvailablePromos(list || []);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const handleApply = async (promoToApply?: string) => {
    const targetCode = (promoToApply || code).trim().toUpperCase();
    if (!targetCode) {
      Alert.alert('Missing Code', 'Please enter a coupon code');
      return;
    }

    try {
      setLoading(true);
      const res = await promosApi.validate(targetCode, cartAmount);
      if (res.valid) {
        onApply({ ...res, code: targetCode });
        setCode('');
      } else {
        Alert.alert('Invalid Coupon', res.message || 'This promo code cannot be applied to your order.');
      }
    } catch (err: any) {
      Alert.alert(
        'Invalid Coupon',
        err?.response?.data?.message || err?.message || 'Coupon code is not valid or expired.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    onApply(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Apply Coupons & Offers</Text>

      {appliedPromo ? (
        <View style={styles.appliedCard}>
          <View style={{ flex: 1 }}>
            <View style={styles.codeRow}>
              <Text style={styles.appliedCode}>{appliedPromo.code}</Text>
              <View style={styles.appliedBadge}>
                <Text style={styles.appliedBadgeText}>APPLIED</Text>
              </View>
            </View>
            <Text style={styles.appliedSavings}>
              You save ₹{Math.round(appliedPromo.discountAmount)} with this coupon!
            </Text>
          </View>
          <Pressable onPress={handleRemove} hitSlop={10}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Enter Promo Code"
              placeholderTextColor={Colors.mutedForeground}
              autoCapitalize="characters"
              value={code}
              onChangeText={setCode}
            />
            <Pressable
              style={[styles.applyBtn, (!code.trim() || loading) && styles.applyBtnDisabled]}
              disabled={!code.trim() || loading}
              onPress={() => handleApply()}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.applyBtnText}>Apply</Text>
              )}
            </Pressable>
          </View>

          {availablePromos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promoList}>
              {availablePromos.map((p) => (
                <Pressable
                  key={p.id}
                  style={styles.couponCard}
                  onPress={() => handleApply(p.code)}>
                  <View style={styles.couponHeader}>
                    <Text style={styles.couponCode}>{p.code}</Text>
                    <Text style={styles.couponDiscount}>
                      {p.discountType === 'PERCENTAGE'
                        ? `${p.discountValue}% OFF`
                        : `₹${p.discountValue} OFF`}
                    </Text>
                  </View>
                  <Text style={styles.couponMin}>
                    Min order ₹{p.minOrderValue}
                    {p.maxDiscount ? ` • Max discount ₹${p.maxDiscount}` : ''}
                  </Text>
                  <Text style={styles.tapToApply}>Tap to apply</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
    backgroundColor: Colors.card,
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnDisabled: {
    opacity: 0.5,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  appliedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successTint,
    borderColor: Colors.success,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 14,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appliedCode: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.success,
  },
  appliedBadge: {
    backgroundColor: Colors.success,
    borderRadius: Radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  appliedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  appliedSavings: {
    fontSize: 12,
    color: Colors.foreground,
    marginTop: 4,
  },
  removeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.destructive,
    marginLeft: 12,
  },
  promoList: {
    marginTop: 12,
  },
  couponCard: {
    width: 180,
    backgroundColor: Colors.primaryTint,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primarySubtle,
    borderStyle: 'dashed',
    padding: 12,
    marginRight: 10,
  },
  couponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  couponCode: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  couponDiscount: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.success,
  },
  couponMin: {
    fontSize: 10,
    color: Colors.mutedForeground,
    marginTop: 4,
  },
  tapToApply: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 8,
  },
});
