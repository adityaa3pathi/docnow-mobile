import { useState } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '@/lib/auth';
import { openCheckout } from '@/lib/razorpay';
import { cartApi, paymentsApi } from '@/lib/tests/api';
import type { Address, PromoValidationResult, Slot } from '@/lib/tests/types';

export function useTestCheckout() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const startCheckout = async ({
    slot,
    slotDate,
    address,
    promo,
    cartId,
  }: {
    slot: Slot;
    slotDate: string;
    address: Address;
    promo: PromoValidationResult | null;
    cartId: string;
  }): Promise<{ success: boolean; bookingId?: string; error?: string }> => {
    try {
      setSubmitting(true);

      // 1. Pre-checkout partner availability check
      const validation = await paymentsApi.validate({
        cartId,
        zipcode: address.pincode,
        date: slotDate,
      });

      if (!validation.valid && validation.unavailable?.length > 0) {
        const unavailNames = validation.unavailable.map((u) => u.testName).join(', ');
        Alert.alert(
          'Tests Unavailable in Your Area',
          `The following tests cannot be serviced at pincode ${address.pincode}: ${unavailNames}. Please remove them from your cart to proceed.`,
        );
        return { success: false, error: 'Items unavailable' };
      }

      // 2. Initiate Payment & create booking on server
      const initRes = await paymentsApi.initiate({
        slot_id: slot.stm_id,
        slotLabel: slot.display_time || slot.slot_time,
        slotDate,
        addressId: address.id,
        promoCode: promo?.code,
      });

      // 3. Handle zero-amount booking (e.g. 100% promo coverage)
      if (initRes.status === 'confirmed' || initRes.amount === 0) {
        await cartApi.clear().catch(() => {});
        return { success: true, bookingId: initRes.bookingId };
      }

      // 4. Open Razorpay Gateway
      if (!initRes.keyId || !initRes.razorpayOrderId) {
        throw new Error('Payment configuration missing from server');
      }

      const outcome = await openCheckout({
        keyId: initRes.keyId,
        orderId: initRes.razorpayOrderId,
        amountPaise: initRes.amount,
        description: `Diagnostic Tests Home Pickup (${slotDate})`,
        prefill: {
          name: user?.name || undefined,
          contact: user?.mobile || undefined,
          email: user?.email || undefined,
        },
      });

      if (outcome.kind !== 'paid') {
        const message =
          outcome.kind === 'could_not_open'
            ? 'Razorpay checkout requires a standalone build or dev client.'
            : outcome.kind === 'failed'
              ? outcome.message
              : 'Payment was dismissed.';
        Alert.alert('Payment Not Completed', message);
        return { success: false, error: message };
      }

      // 5. Verify payment signature with server
      await paymentsApi.verify({
        bookingId: initRes.bookingId,
        razorpay_payment_id: outcome.payment.razorpay_payment_id,
        razorpay_order_id: outcome.payment.razorpay_order_id,
        razorpay_signature: outcome.payment.razorpay_signature,
      });

      // 6. Clear cart upon confirmed verification
      await cartApi.clear().catch(() => {});

      return { success: true, bookingId: initRes.bookingId };
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Checkout failed. Please try again.';
      Alert.alert('Checkout Error', msg);
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  return { startCheckout, submitting };
}
