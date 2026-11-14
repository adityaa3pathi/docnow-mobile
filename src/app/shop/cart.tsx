import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AddPersonSheet } from '@/components/consult/add-person-sheet';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { AddressSection } from '@/components/checkout/address-section';
import { AddressSheet } from '@/components/checkout/address-sheet';
import { CartItemCard } from '@/components/checkout/cart-item-card';
import { CheckoutBar } from '@/components/checkout/checkout-bar';
import { OrderSummary } from '@/components/checkout/order-summary';
import { ProfileSheet } from '@/components/checkout/profile-sheet';
import { PromoSection } from '@/components/checkout/promo-section';
import { SlotSection } from '@/components/checkout/slot-section';
import { Notice } from '@/components/doctor/ui';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { useOffers } from '@/hooks/use-offers';
import { useSlotHold } from '@/hooks/use-slot-hold';
import { resolveDefaultId } from '@/lib/account/addresses';
import { readDefaultAddressId } from '@/lib/account/store';
import { CART_KEY, cartApi, useCart, useRemoveCartItem } from '@/lib/cart';
import {
    addresses as addressApi,
    checkoutHint,
    checkoutReady,
    duplicateAssignment,
    duplicateMessage,
    forgetCheckoutKey,
    initiateBody,
    initiateErrorBody,
    initiateProblem,
    itemsTotal,
    keyForCheckout,
    nextStep,
    orderTotals,
    paymentOutcomeMessage,
    payments,
    unavailableCodes,
    unavailableMessage,
    verifiedOutcome,
    type CheckoutPaymentMethod,
    type MissingProfileFields,
    type SavedAddress,
    type VerifiedOutcome,
} from '@/lib/checkout';
import { friendlyError, people as peopleApi } from '@/lib/consult/api';
import { sortPeople } from '@/lib/consult/people';
import { istDayKey, istDayKeyPlus } from '@/lib/lab/bookings';
import { openCheckout } from '@/lib/razorpay';

const DAYS_AHEAD = 7;

/** The cart and the whole checkout, matching the website's cart page step for step. */
export default function CartScreen() {
    const queryClient = useQueryClient();
    const { cart, count, loading, failed, refresh } = useCart();
    const remove = useRemoveCartItem();
    const items = cart?.items ?? [];

    const people = useQuery({
        queryKey: ['checkout', 'people'],
        staleTime: 60_000,
        queryFn: async () => {
            // A thin profile cannot make a Self person, and that is fine: the line stays in your name.
            await peopleApi.ensureSelf().catch(() => undefined);
            return sortPeople(await peopleApi.list());
        },
    });
    const selfId = people.data?.find((person) => person.relation?.toLowerCase() === 'self')?.id ?? null;

    const addressList = useQuery({ queryKey: ['checkout', 'addresses'], queryFn: addressApi.list, staleTime: 60_000 });
    const saved = addressList.data ?? [];
    const [chosenAddressId, setChosenAddressId] = useState('');
    const defaultAddress = useQuery({
        queryKey: ['account', 'default-address'],
        queryFn: readDefaultAddressId,
        staleTime: 60_000,
    });
    // The default address is used until one is picked, so checkout is never stuck with none.
    const preferredId = resolveDefaultId(saved, defaultAddress.data);
    const address = saved.find((row) => row.id === chosenAddressId) ?? saved.find((row) => row.id === preferredId) ?? null;
    const addressId = address?.id ?? '';

    const days = useMemo(() => Array.from({ length: DAYS_AHEAD }, (_, index) => istDayKeyPlus(index)), []);
    const [date, setDate] = useState(() => istDayKey());
    const hold = useSlotHold(address, date);

    const total = itemsTotal(items);
    const offers = useOffers(total);
    const options = useQuery({ queryKey: ['checkout', 'payment-options'], queryFn: payments.options, staleTime: 300_000 });
    const payOnCollectionOffered = options.data?.payOnCollection === true;
    const [method, setMethod] = useState<CheckoutPaymentMethod>('ONLINE');
    const [billingPatientId, setBillingPatientId] = useState('self');

    const totals = orderTotals({
        items,
        discountAmount: offers.applied?.discountAmount,
        walletBalance: offers.walletBalance,
        useWallet: offers.useWallet,
    });
    const payAtCollection = payOnCollectionOffered && method === 'PAY_ON_COLLECTION' && totals.finalPayable > 0;

    const [problem, setProblem] = useState<string | null>(null);
    const [blocked, setBlocked] = useState<string[]>([]);
    const [askProfile, setAskProfile] = useState<MissingProfileFields | null>(null);
    const [busy, setBusy] = useState(false);
    const paying = useRef(false);
    const [addressSheet, setAddressSheet] = useState<{ open: boolean; address: SavedAddress | null }>({ open: false, address: null });
    const [personFor, setPersonFor] = useState<string | null>(null);

    const assign = useMutation({
        mutationFn: ({ itemId, patientId }: { itemId: string; patientId: string | null }) =>
            cartApi.assignPatient(itemId, patientId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: CART_KEY }),
    });

    const readiness = {
        addressId,
        date,
        time: hold.slot?.label ?? '',
        locked: hold.locked,
        freezing: hold.freezing,
    };
    const hint = checkoutHint(readiness);
    const ready = checkoutReady(readiness) && items.length > 0;

    /** The hints are only a head start; the result screen still asks the server for the outcome. */
    async function settle(bookingId: string, slotId: string, hint: { verified?: VerifiedOutcome; atCollection?: boolean } = {}) {
        if (cart?.id) await forgetCheckoutKey(cart.id, slotId);
        await queryClient.invalidateQueries({ queryKey: CART_KEY });
        router.replace({
            pathname: '/shop/result',
            params: { bookingId, verified: hint.verified ?? '', collection: hint.atCollection ? '1' : '' },
        });
    }

    async function pay() {
        // State lands a frame later, so two quick taps would both see busy as false.
        if (paying.current) return;
        if (!cart?.id || !hold.slot) {
            setProblem(hint ?? 'Please choose a slot to continue.');
            return;
        }
        if (!checkoutReady(readiness)) {
            setProblem(hint);
            return;
        }
        const duplicate = duplicateAssignment(items);
        if (duplicate) {
            setProblem(duplicateMessage(duplicate));
            return;
        }

        paying.current = true;
        setBusy(true);
        setProblem(null);
        const slotId = hold.slot.id;
        try {
            if (address?.pincode) {
                try {
                    const reply = await payments.validateCart({
                        cartId: cart.id,
                        zipcode: address.pincode,
                        lat: address.lat,
                        long: address.long,
                        date,
                    });
                    const unavailable = reply.unavailable ?? [];
                    if (reply.valid === false && unavailable.length > 0) {
                        setBlocked(unavailableCodes(unavailable));
                        setProblem(unavailableMessage(unavailable));
                        return;
                    }
                    setBlocked([]);
                } catch {
                    // The lab partner may be slow; a failed check warns on the website and does not block.
                }
            }

            const key = await keyForCheckout(cart.id, slotId);
            const reply = await payments.initiate(
                initiateBody({
                    slotId,
                    slotLabel: hold.slot.label,
                    slotDate: hold.slot.slotDate ?? date,
                    addressId,
                    promoCode: offers.applied?.code,
                    useWallet: offers.useWallet,
                    billingPatientId,
                    paymentMethod: payOnCollectionOffered ? method : 'ONLINE',
                }),
                key,
            );

            const step = nextStep(reply);
            if (step.kind === 'unexpected') {
                setProblem('We could not start this payment. Please try again.');
                return;
            }
            if (step.kind === 'pay_on_collection') {
                await settle(step.bookingId, slotId, { atCollection: true });
                return;
            }
            if (step.kind === 'confirmed') {
                await settle(step.bookingId, slotId);
                return;
            }

            const outcome = await openCheckout({
                keyId: step.keyId,
                orderId: step.orderId,
                amountPaise: step.amountPaise,
                description: 'Lab test booking',
            });
            if (outcome.kind !== 'paid') {
                setProblem(paymentOutcomeMessage(outcome.kind));
                return;
            }
            let verified: VerifiedOutcome = 'pending';
            try {
                const reply = await payments.verify({ bookingId: step.bookingId, ...outcome.payment });
                verified = verifiedOutcome(reply.status);
            } catch {
                // A failed verify says nothing about the payment; the result screen asks the server.
            }
            await settle(step.bookingId, slotId, { verified });
        } catch (e) {
            const found = initiateProblem(initiateErrorBody(e), friendlyError(e, 'We could not place this order. Please try again.'));
            if (found.kind === 'profile_incomplete') setAskProfile(found.missing);
            else if (found.kind === 'disabled_items') {
                setBlocked(found.items.map((row) => row.testCode));
                setProblem(found.message);
            } else setProblem(found.message);
        } finally {
            paying.current = false;
            setBusy(false);
        }
    }

    if (loading || people.isLoading || addressList.isLoading) return <LoadingBlock label="Loading your cart" />;

    if (failed && !cart) {
        return (
            <View style={styles.pad}>
                <ErrorState message="We could not load your cart." onRetry={refresh} />
            </View>
        );
    }

    if (count === 0) {
        return (
            <View style={styles.pad}>
                <EmptyState
                    title="Your cart is empty"
                    body="Add a test or a package to get started."
                    action={
                        <Pressable
                            onPress={() => router.replace('/tests')}
                            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
                            accessibilityRole="button"
                            accessibilityLabel="Browse lab tests">
                            <Text style={styles.ctaText}>Browse lab tests</Text>
                        </Pressable>
                    }
                />
            </View>
        );
    }

    return (
        <View style={styles.flex}>
            <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
                <Text style={styles.count}>
                    {count} {count === 1 ? 'item' : 'items'}
                </Text>

                {items.map((item) => (
                    <CartItemCard
                        key={item.id}
                        item={item}
                        people={people.data ?? []}
                        selfId={selfId}
                        assigning={assign.isPending && assign.variables?.itemId === item.id}
                        removing={remove.isPending && remove.variables === item.id}
                        unavailableNote={
                            item.isAvailable === false || blocked.includes(item.testCode)
                                ? 'This test cannot be booked right now. Please remove it to continue.'
                                : null
                        }
                        onAssign={(personId) => assign.mutate({ itemId: item.id, patientId: personId })}
                        onAddPerson={() => setPersonFor(item.id)}
                        onRemove={() => remove.mutate(item.id)}
                    />
                ))}
                {remove.isError ? <Notice tone="error">{friendlyError(remove.error, 'Could not remove that item. Please try again.')}</Notice> : null}
                {assign.isError ? <Notice tone="error">{friendlyError(assign.error, 'Could not save that person. Please try again.')}</Notice> : null}

                <AddressSection
                    addresses={saved}
                    selectedId={addressId}
                    onSelect={(id) => {
                        setChosenAddressId(id);
                        hold.release();
                    }}
                    onAdd={() => setAddressSheet({ open: true, address: null })}
                    onEdit={(row) => setAddressSheet({ open: true, address: row })}
                />

                {addressId ? (
                    <SlotSection
                        days={days}
                        date={date}
                        onDate={(next) => {
                            if (next !== date) setDate(next);
                        }}
                        slots={hold.slots}
                        loading={hold.loadingSlots}
                        error={hold.slotsError}
                        onRetry={hold.refreshSlots}
                        slot={hold.slot}
                        onSlot={hold.selectSlot}
                        locked={hold.locked}
                        freezing={hold.freezing}
                        secondsRemaining={hold.secondsRemaining}
                        level={hold.level}
                        onLock={() => void hold.lock()}
                        notice={hold.notice}
                    />
                ) : null}

                <PromoSection offers={offers} cartTotal={total} />

                <OrderSummary
                    totals={totals}
                    address={address}
                    date={date}
                    slotLabel={hold.slot?.label ?? null}
                    people={people.data ?? []}
                    billingPatientId={billingPatientId}
                    onBillingPatient={setBillingPatientId}
                    payOnCollectionOffered={payOnCollectionOffered}
                    paymentMethod={method}
                    onPaymentMethod={setMethod}
                    payAtCollection={payAtCollection}
                />

                {problem ? <Notice tone="error">{problem}</Notice> : null}
            </ScrollView>

            <CheckoutBar
                finalPayable={totals.finalPayable}
                payAtCollection={payAtCollection}
                hint={hint}
                ready={ready}
                busy={busy}
                onPress={() => void pay()}
            />

            {addressSheet.open ? (
                <AddressSheet
                    address={addressSheet.address}
                    onClose={() => setAddressSheet({ open: false, address: null })}
                    onSaved={(next) => {
                        setChosenAddressId(next.id);
                        hold.release();
                        void queryClient.invalidateQueries({ queryKey: ['checkout', 'addresses'] });
                    }}
                />
            ) : null}

            <AddPersonSheet
                visible={personFor !== null}
                onClose={() => setPersonFor(null)}
                onAdded={(person) => {
                    void queryClient.invalidateQueries({ queryKey: ['checkout', 'people'] });
                    if (personFor) assign.mutate({ itemId: personFor, patientId: person.id });
                    setPersonFor(null);
                }}
            />

            <ProfileSheet
                visible={askProfile !== null}
                missing={askProfile ?? {}}
                onClose={() => setAskProfile(null)}
                onSaved={() => {
                    setAskProfile(null);
                    void pay();
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: Colors.surfaceSubtle },
    pad: { padding: Space[4] },
    list: { padding: Space[4], gap: Space[3], paddingBottom: Space[8] },
    count: { ...Type.small, fontFamily: Fonts.medium, color: Colors.inkMuted },
    cta: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Space[6], borderRadius: Radius.md, backgroundColor: Colors.primary },
    ctaPressed: { backgroundColor: Colors.primaryHover },
    ctaText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.onPrimary },
});
