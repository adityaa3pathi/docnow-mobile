import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SlotPillsSkeleton } from '@/components/tests/test-card-skeleton';
import { Colors, Radius } from '@/constants/theme';
import { hapticImpact, hapticNotify, ImpactFeedbackStyle, NotificationFeedbackType } from '@/lib/haptics';
import { addressesApi, locationApi, slotsApi } from '@/lib/tests/api';
import type { Address, Slot } from '@/lib/tests/types';

// Countdown switches to the warning treatment once this many seconds remain
const EXPIRING_SOON_SECONDS = 180;

interface Props {
  address: Address;
  selectedSlot: Slot | null;
  onSlotSelect: (slot: Slot, slotDate: string) => void;
}

export function SlotPicker({ address, selectedSlot, onSlotSelect }: Props) {
  // Generate 7-day rolling window: today to today + 6 days
  const dateOptions = useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      list.push({ dateStr, dayName, monthDay });
    }
    return list;
  }, []);

  const [selectedDate, setSelectedDate] = useState(dateOptions[0].dateStr);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);

  // 15-minute slot lock countdown timer
  const [frozenSlotId, setFrozenSlotId] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // Fetch slots whenever selectedDate or address changes
  useEffect(() => {
    if (!address?.pincode) return;
    let cancelled = false;

    async function loadSlots() {
      try {
        setLoading(true);

        let finalLat = address.lat;
        let finalLong = address.long;

        // Auto-geocode if coordinates are missing from the address
        if (!finalLat || !finalLong) {
          try {
            const geoRes = await locationApi.geocode(address.pincode);
            if (geoRes?.lat && geoRes?.long) {
              finalLat = geoRes.lat;
              finalLong = geoRes.long;
              // Persist coordinates back to address for future bookings
              addressesApi.patchCoords(address.id, finalLat, finalLong).catch(() => {});
            }
          } catch {
            // Geocoding failed, fallback to Delhi coords below
          }
        }

        const res = await slotsApi.list({
          lat: finalLat || '28.6139',
          long: finalLong || '77.2090',
          zipcode: address.pincode,
          date: selectedDate,
        });

        if (!cancelled) {
          setSlots(res.slots || []);
        }
      } catch {
        if (!cancelled) {
          setSlots([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, address?.id, address?.pincode, address?.lat, address?.long]);

  // Handle countdown timer & auto-refreeze at 3 minutes (180s)
  useEffect(() => {
    if (!frozenSlotId || secondsRemaining === null) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          setFrozenSlotId(null);
          Alert.alert('Slot Released', 'Your slot reservation expired. Please pick a slot again.');
          return null;
        }
        if (prev === 180 && frozenSlotId) {
          // Silent re-freeze at 3 mins
          slotsApi.freeze(frozenSlotId).catch(() => {});
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [frozenSlotId, secondsRemaining]);

  const handlePickSlot = async (s: Slot) => {
    try {
      // Freeze slot with partner API
      await slotsApi.freeze(s.stm_id);
      setFrozenSlotId(s.stm_id);
      setSecondsRemaining(15 * 60); // 15 minutes
      onSlotSelect(s, selectedDate);
      hapticImpact(ImpactFeedbackStyle.Medium);
    } catch (err: any) {
      hapticNotify(NotificationFeedbackType.Error);
      Alert.alert(
        'Slot Unavailable',
        err?.response?.data?.message || 'This slot is no longer available. Please select another time.',
      );
    }
  };

  // Group slots by time-of-day: Morning, Afternoon, Evening
  const { morning, afternoon, evening } = useMemo(() => {
    const morningSlots: Slot[] = [];
    const afternoonSlots: Slot[] = [];
    const eveningSlots: Slot[] = [];

    slots.forEach((s) => {
      const timeStr = (s.display_time || s.slot_time).toLowerCase();
      // Match hour pattern
      const isMorning = timeStr.includes('am') || timeStr.startsWith('0') || timeStr.startsWith('10') || timeStr.startsWith('11');
      const isEvening = timeStr.includes('pm') && (timeStr.includes('4:') || timeStr.includes('5:') || timeStr.includes('6:') || timeStr.includes('7:') || timeStr.includes('8:'));

      if (isMorning) {
        morningSlots.push(s);
      } else if (isEvening) {
        eveningSlots.push(s);
      } else {
        afternoonSlots.push(s);
      }
    });

    return { morning: morningSlots, afternoon: afternoonSlots, evening: eveningSlots };
  }, [slots]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const expiringSoon = secondsRemaining !== null && secondsRemaining <= EXPIRING_SOON_SECONDS;

  return (
    <View style={styles.container}>
      {/* 15-Minute Lock Banner */}
      {secondsRemaining !== null && (
        <View style={[styles.timerBanner, expiringSoon && styles.timerBannerWarning]}>
          {expiringSoon ? (
            <Text style={[styles.timerText, styles.timerTextWarning]}>
              ⚠️ Expiring Soon: <Text style={styles.timerBold}>{formatTimer(secondsRemaining)}</Text>
            </Text>
          ) : (
            <Text style={styles.timerText}>
              ⏱ Slot reserved for <Text style={styles.timerBold}>{formatTimer(secondsRemaining)}</Text>
            </Text>
          )}
        </View>
      )}

      {/* Date Horizontal Selector */}
      <Text style={styles.sectionTitle}>Select Sample Collection Date</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
        {dateOptions.map((opt) => {
          const isSelected = opt.dateStr === selectedDate;
          return (
            <Pressable
              key={opt.dateStr}
              onPress={() => {
                setSelectedDate(opt.dateStr);
                setFrozenSlotId(null);
                setSecondsRemaining(null);
              }}
              style={[styles.dateCard, isSelected && styles.dateCardActive]}>
              <Text style={[styles.dayName, isSelected && styles.textActive]}>{opt.dayName}</Text>
              <Text style={[styles.monthDay, isSelected && styles.textActive]}>{opt.monthDay}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Slots Section */}
      <Text style={styles.sectionTitle}>Select 1-Hour Time Window</Text>

      {loading ? (
        <View style={styles.slotsContainer}>
          <SlotPillsSkeleton count={6} />
        </View>
      ) : slots.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No slots available for this date. Please pick another date.</Text>
        </View>
      ) : (
        <View style={styles.slotsContainer}>
          {/* Morning Slots */}
          {morning.length > 0 && (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>🌅 Morning (6:00 AM – 12:00 PM)</Text>
              <View style={styles.slotGrid}>
                {morning.map((s) => {
                  const isSelected = selectedSlot?.stm_id === s.stm_id;
                  const isFasting = s.slot_time.startsWith('06') || s.slot_time.startsWith('07') || s.slot_time.startsWith('08');
                  return (
                    <Pressable
                      key={s.stm_id}
                      onPress={() => handlePickSlot(s)}
                      style={[styles.slotPill, isSelected && styles.slotPillActive]}>
                      <Text style={[styles.slotText, isSelected && styles.textActive]}>
                        {s.display_time || s.slot_time}
                      </Text>
                      {isFasting && (
                        <View style={[styles.fastingBadge, isSelected && styles.fastingBadgeActive]}>
                          <Text style={[styles.fastingText, isSelected && { color: '#fff' }]}>Fasting</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Afternoon Slots */}
          {afternoon.length > 0 && (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>☀️ Afternoon (12:00 PM – 4:00 PM)</Text>
              <View style={styles.slotGrid}>
                {afternoon.map((s) => {
                  const isSelected = selectedSlot?.stm_id === s.stm_id;
                  return (
                    <Pressable
                      key={s.stm_id}
                      onPress={() => handlePickSlot(s)}
                      style={[styles.slotPill, isSelected && styles.slotPillActive]}>
                      <Text style={[styles.slotText, isSelected && styles.textActive]}>
                        {s.display_time || s.slot_time}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Evening Slots */}
          {evening.length > 0 && (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>🌙 Evening (4:00 PM – 8:00 PM)</Text>
              <View style={styles.slotGrid}>
                {evening.map((s) => {
                  const isSelected = selectedSlot?.stm_id === s.stm_id;
                  return (
                    <Pressable
                      key={s.stm_id}
                      onPress={() => handlePickSlot(s)}
                      style={[styles.slotPill, isSelected && styles.slotPillActive]}>
                      <Text style={[styles.slotText, isSelected && styles.textActive]}>
                        {s.display_time || s.slot_time}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  timerBanner: {
    backgroundColor: Colors.primaryTint,
    borderColor: Colors.primarySubtle,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  timerBannerWarning: {
    backgroundColor: Colors.warningTint,
    borderColor: Colors.warning,
  },
  timerText: {
    fontSize: 13,
    color: Colors.primary,
  },
  timerTextWarning: {
    color: Colors.warning,
  },
  timerBold: {
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: 10,
    marginTop: 6,
  },
  dateScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dateCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 85,
  },
  dateCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  dayName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.foreground,
  },
  monthDay: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 3,
  },
  textActive: {
    color: '#fff',
    fontWeight: '600',
  },
  slotsContainer: {
    marginTop: 6,
  },
  group: {
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.mutedForeground,
    marginBottom: 8,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotPill: {
    flexBasis: '48%',
    flexGrow: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotPillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  slotText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.foreground,
  },
  fastingBadge: {
    backgroundColor: Colors.amberTint,
    borderRadius: Radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  fastingBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  fastingText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.warning,
  },
  emptyBox: {
    padding: 24,
    borderRadius: Radius.md,
    backgroundColor: Colors.cardMuted,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
});
