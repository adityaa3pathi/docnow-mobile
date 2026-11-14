import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CampLocation } from '@/components/camps/camp-location';
import { CampRegisterBar } from '@/components/camps/camp-register-bar';
import { CampSummary } from '@/components/camps/camp-summary';
import { CampTests } from '@/components/camps/camp-tests';
import { DobField } from '@/components/camps/dob-field';
import { ProfileSheet } from '@/components/checkout/profile-sheet';
import { PromoSection } from '@/components/checkout/promo-section';
import { Section } from '@/components/checkout/section';
import { AddPersonSheet } from '@/components/consult/add-person-sheet';
import { PersonPicker } from '@/components/consult/person-picker';
import { ErrorState, LoadingBlock } from '@/components/consult/states';
import { Notice } from '@/components/doctor/ui';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { useOffers } from '@/hooks/use-offers';
import {
    campCheckoutBody,
    campDateRange,
    campErrorBody,
    campHint,
    campProblem,
    campReady,
    camps as campsApi,
    campStatus,
    dobFromPerson,
    forgetCampKey,
    keyForCamp,
    nextCampStep,
    campTotals,
} from '@/lib/camps';
import { payments, paymentOutcomeMessage, verifiedOutcome, type MissingProfileFields, type VerifiedOutcome } from '@/lib/checkout';
import { friendlyError, people as peopleApi } from '@/lib/consult/api';
import { sortPeople } from '@/lib/consult/people';
import { toneColors } from '@/lib/consult/status';
import { openCheckout } from '@/lib/razorpay';

/** One camp, and the whole registration, matching the website's camp page step for step. */
export default function CampDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const campId = id ?? '';
    const queryClient = useQueryClient();

    const camp = useQuery({ queryKey: ['camps', 'detail', campId], queryFn: () => campsApi.detail(campId), enabled: Boolean(campId) });
    const people = useQuery({
        queryKey: ['camps', 'people'],
        staleTime: 60_000,
        queryFn: async () => {
            // A thin profile cannot make a Self person; the sheet below then asks for what is missing.
            await peopleApi.ensureSelf().catch(() => undefined);
            return sortPeople(await peopleApi.list());
        },
    });

    const [patientId, setPatientId] = useState('');
    const [dob, setDob] = useState('');
    const [autoFilled, setAutoFilled] = useState(false);
    const [problem, setProblem] = useState<string | null>(null);
    const [askProfile, setAskProfile] = useState<MissingProfileFields | null>(null);
    const [addPerson, setAddPerson] = useState(false);
    const [busy, setBusy] = useState(false);
    const registering = useRef(false);

    const list = people.data ?? [];
    // Self is the default, as on the website, and only until someone picks another person.
    useEffect(() => {
        if (patientId || list.length === 0) return;
        const self = list.find((person) => person.relation?.toLowerCase() === 'self');
        choose((self ?? list[0]).id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [list.length]);

    function choose(nextId: string) {
        setPatientId(nextId);
        const saved = dobFromPerson(list.find((person) => person.id === nextId)?.dob);
        setDob(saved);
        setAutoFilled(Boolean(saved));
    }

    const price = camp.data?.price ?? 0;
    const offers = useOffers(price);
    const totals = campTotals({
        price,
        discountAmount: offers.applied?.discountAmount,
        walletBalance: offers.walletBalance,
        useWallet: offers.useWallet,
    });

    const readiness = { patientId, dob };
    const hint = campHint(readiness);
    const ready = campReady(readiness) && Boolean(camp.data);

    async function settle(bookingId: string, verified?: VerifiedOutcome) {
        await forgetCampKey(campId, patientId);
        await queryClient.invalidateQueries({ queryKey: ['lab', 'bookings'] });
        router.replace({ pathname: '/camps/result', params: { bookingId, verified: verified ?? '' } });
    }

    async function register() {
        // State lands a frame later, so two quick taps would both see busy as false.
        if (registering.current) return;
        if (!camp.data || !campReady(readiness)) {
            setProblem(hint);
            return;
        }

        registering.current = true;
        setBusy(true);
        setProblem(null);
        try {
            const key = await keyForCamp(campId, patientId);
            const reply = await campsApi.checkout(
                campCheckoutBody({ campId, patientId, dob, promoCode: offers.applied?.code, useWallet: offers.useWallet }),
                key,
            );

            const step = nextCampStep(reply);
            if (step.kind === 'unexpected') {
                setProblem('We could not start this registration. Please try again.');
                return;
            }
            if (step.kind === 'confirmed') {
                await settle(step.bookingId);
                return;
            }

            const outcome = await openCheckout({
                keyId: step.keyId,
                orderId: step.orderId,
                amountPaise: step.amountPaise,
                description: 'Camp Registration',
            });
            if (outcome.kind !== 'paid') {
                setProblem(paymentOutcomeMessage(outcome.kind));
                return;
            }
            let verified: VerifiedOutcome = 'pending';
            try {
                const verifyReply = await payments.verify({ bookingId: step.bookingId, ...outcome.payment });
                verified = verifiedOutcome(verifyReply.status);
            } catch {
                // A failed verify says nothing about the payment; the result screen asks the server.
            }
            await settle(step.bookingId, verified);
        } catch (e) {
            const found = campProblem(campErrorBody(e), friendlyError(e, 'We could not complete this registration. Please try again.'));
            if (found.kind === 'profile_incomplete') setAskProfile(found.missing);
            else setProblem(found.message);
        } finally {
            registering.current = false;
            setBusy(false);
        }
    }

    if (camp.isLoading || people.isLoading) return <LoadingBlock label="Loading this camp" />;

    if (camp.isError || !camp.data) {
        return (
            <View style={styles.pad}>
                <ErrorState
                    message={camp.isError ? friendlyError(camp.error, 'This camp may no longer be active.') : 'This camp may no longer be active.'}
                    onRetry={() => void camp.refetch()}
                />
            </View>
        );
    }

    const detail = camp.data;
    const status = campStatus(detail.startDate, detail.endDate);
    const pill = toneColors[status.tone];
    const person = list.find((p) => p.id === patientId) ?? null;

    return (
        <View style={styles.flex}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.head}>
                    <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                        <Text style={[styles.pillText, { color: pill.fg }]}>{status.label}</Text>
                    </View>
                    <Text style={styles.name} accessibilityRole="header">
                        {detail.name}
                    </Text>
                    {detail.description ? <Text style={styles.body}>{detail.description}</Text> : null}
                    <Text style={styles.meta}>{campDateRange(detail.startDate, detail.endDate)}</Text>
                </View>

                <CampTests items={detail.items} />
                <CampLocation camp={detail} />

                <Section title="Who is this for?">
                    <PersonPicker
                        people={list}
                        value={patientId}
                        onChange={choose}
                        onAdd={() => setAddPerson(true)}
                        legend="Who is this for?"
                        note="Select the patient registering for the camp. One person per registration — register again for anyone else."
                    />
                    {patientId ? <DobField value={dob} onChange={(next) => { setDob(next); setAutoFilled(false); }} autoFilled={autoFilled} /> : null}
                </Section>

                {/* A camp has no numbered steps, unlike the cart. */}
                <PromoSection offers={offers} cartTotal={price} step={null} />

                <CampSummary totals={totals} person={person} />

                {problem ? <Notice tone="error">{problem}</Notice> : null}
            </ScrollView>

            <CampRegisterBar finalPayable={totals.finalPayable} hint={hint} ready={ready} busy={busy} onPress={() => void register()} />

            <AddPersonSheet
                visible={addPerson}
                onClose={() => setAddPerson(false)}
                onAdded={(added) => {
                    void queryClient.invalidateQueries({ queryKey: ['camps', 'people'] });
                    setPatientId(added.id);
                    const saved = dobFromPerson(added.dob);
                    setDob(saved);
                    setAutoFilled(Boolean(saved));
                    setAddPerson(false);
                }}
            />

            <ProfileSheet
                visible={askProfile !== null}
                missing={askProfile ?? {}}
                onClose={() => setAskProfile(null)}
                onSaved={() => {
                    setAskProfile(null);
                    void queryClient.invalidateQueries({ queryKey: ['camps', 'people'] });
                    void register();
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: Colors.surfaceSubtle },
    pad: { padding: Space[4] },
    content: { padding: Space[4], gap: Space[3], paddingBottom: Space[8] },
    head: { gap: Space[2] },
    pill: { alignSelf: 'flex-start', paddingHorizontal: Space[3], paddingVertical: Space[1], borderRadius: Radius.full },
    pillText: { ...Type.small, fontFamily: Fonts.semibold },
    name: { ...Type.title, fontFamily: Fonts.bold, color: Colors.ink },
    body: { ...Type.small, color: Colors.inkMuted },
    meta: { ...Type.small, color: Colors.ink },
});
