import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/consult/badge';
import { ErrorState, LoadingBlock } from '@/components/consult/states';
import { ActionButton, Notice } from '@/components/doctor/ui';
import { LabCancelSheet } from '@/components/lab/cancel-sheet';
import { CollectorCard } from '@/components/lab/collector-card';
import { ReportRow } from '@/components/lab/report-row';
import { LabRescheduleSheet } from '@/components/lab/reschedule-sheet';
import { StatusTimeline } from '@/components/lab/timeline';
import { Colors, Radius, Space, Type } from '@/constants/theme';
import { labBookingsKey, useLabBooking } from '@/hooks/use-lab-bookings';
import { friendlyError } from '@/lib/consult/api';
import { invoiceViewUrl, lab, labInvoices, labReports } from '@/lib/lab/api';
import { formatSlot } from '@/lib/lab/bookings';
import { moneyLines } from '@/lib/lab/money';
import { openSignedDocument } from '@/lib/lab/open';
import { patientGroups } from '@/lib/lab/patients';
import { bookingActions, effectiveBookingStatus, getJourneyBanner, getLabStatusDisplay } from '@/lib/lab/status';
import { buildTimeline } from '@/lib/lab/timeline';

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <View style={styles.card}>
            <Text style={styles.heading} accessibilityRole="header">{title}</Text>
            {children}
        </View>
    );
}

export default function LabBookingScreen() {
    const params = useLocalSearchParams<{ id: string }>();
    const bookingId = String(params.id ?? '');
    const queryClient = useQueryClient();
    const { booking, isLoading, error, isRefetching, refetch } = useLabBooking(bookingId);

    const [cancelOpen, setCancelOpen] = useState(false);
    const [rescheduleOpen, setRescheduleOpen] = useState(false);
    const [invoiceBusy, setInvoiceBusy] = useState(false);
    const [invoiceError, setInvoiceError] = useState<string | null>(null);

    // Tracking calls the lab partner and is rate limited, so it is only asked for where it is allowed.
    const trackable = booking ? bookingActions(booking, getLabStatusDisplay(effectiveBookingStatus(booking), booking.reports, booking.partnerStatus)).canTrack : false;
    const status = useQuery({
        queryKey: ['lab', 'status', bookingId],
        queryFn: () => lab.status(bookingId),
        enabled: trackable,
        staleTime: 60_000,
        retry: false,
    });
    const payment = useQuery({
        queryKey: ['lab', 'payment', bookingId],
        queryFn: () => lab.paymentStatus(bookingId),
        enabled: Boolean(booking),
        staleTime: 60_000,
    });
    const reports = useQuery({
        queryKey: ['lab', 'reports', bookingId],
        queryFn: () => labReports.forBooking(bookingId),
        enabled: Boolean(booking),
        staleTime: 30_000,
    });

    if (isLoading) return <LoadingBlock label="Loading this booking" />;
    if (error && !booking) {
        return (
            <View style={styles.pad}>
                <ErrorState message={friendlyError(error)} onRetry={() => void refetch()} />
            </View>
        );
    }
    if (!booking) {
        return (
            <View style={styles.pad}>
                <ErrorState message="We could not find this booking." onRetry={() => void refetch()} />
            </View>
        );
    }

    const reportList = reports.data ?? booking.reports ?? [];
    const info = status.data
        ? getLabStatusDisplay(status.data.data?.booking_status, reportList, booking.partnerStatus)
        : getLabStatusDisplay(effectiveBookingStatus(booking), reportList, booking.partnerStatus);
    const actions = bookingActions(booking, info);
    const timeline = buildTimeline(info);
    const banner = getJourneyBanner(status.data?.lineage ?? booking, info);
    const patients = patientGroups(status.data);
    const lines = moneyLines({
        totalAmount: booking.totalAmount,
        paymentStatus: booking.paymentStatus,
        paymentMethod: payment.data?.paymentMethod,
        amountDue: payment.data?.amountDue,
        outcome: payment.data?.outcome,
    });
    const reference = actions.partnerBookingId ?? booking.id.slice(0, 8);
    const previousReference = booking.previousPartnerBookingIds?.[0];

    async function openInvoice() {
        setInvoiceBusy(true);
        setInvoiceError(null);
        try {
            const { token } = await labInvoices.link(bookingId);
            await openSignedDocument(invoiceViewUrl(token));
        } catch (e) {
            setInvoiceError(friendlyError(e, 'We could not prepare your invoice right now. Please try again shortly.'));
        } finally {
            setInvoiceBusy(false);
        }
    }

    function refreshAll() {
        void queryClient.invalidateQueries({ queryKey: labBookingsKey });
        void queryClient.invalidateQueries({ queryKey: ['lab', 'status', bookingId] });
        void queryClient.invalidateQueries({ queryKey: ['lab', 'payment', bookingId] });
    }

    return (
        <>
            <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={Colors.primary} />
                }>
                <View style={styles.card}>
                    <View style={styles.top}>
                        <Text style={styles.tests}>{booking.items.length > 0 ? booking.items.join(', ') : 'Lab tests'}</Text>
                        <Badge tone={info.tone}>{info.label}</Badge>
                    </View>
                    <Text style={styles.slot}>{formatSlot(booking)}</Text>
                    <Text style={styles.muted}>Booking {reference}</Text>
                    {previousReference ? <Text style={styles.muted}>Previous reference {previousReference}</Text> : null}
                    {info.referenceCode ? <Text style={styles.muted}>Support code {info.referenceCode}</Text> : null}
                    {booking.isCampBooking && booking.campName ? (
                        <Text style={styles.muted}>Camp: {booking.campName}{booking.campLocation ? `, ${booking.campLocation}` : ''}</Text>
                    ) : null}
                </View>

                {banner ? (
                    <Notice tone={banner.tone === 'warning' ? 'warning' : 'info'}>
                        {`${banner.title}. ${banner.description}`}
                    </Notice>
                ) : null}

                <Section title="Status">
                    <Text style={styles.body}>{timeline.message}</Text>
                    {timeline.subMessage ? <Text style={styles.muted}>{timeline.subMessage}</Text> : null}
                    {status.isFetching ? <Text style={styles.muted}>Checking the latest update...</Text> : null}
                    {status.error ? <Text style={styles.muted}>{friendlyError(status.error)}</Text> : null}
                    {timeline.stopped ? null : <StatusTimeline timeline={timeline} />}
                </Section>

                {actions.showCollector ? (
                    <CollectorCard bookingId={booking.id} canCall={actions.canCallCollector} />
                ) : null}

                {booking.address?.line1 ? (
                    <Section title="Collection address">
                        <Text style={styles.body}>{booking.address.line1}</Text>
                        <Text style={styles.muted}>
                            {[booking.address.city, booking.address.pincode].filter(Boolean).join(' - ')}
                        </Text>
                    </Section>
                ) : null}

                {patients.length > 0 ? (
                    <Section title="Tests by patient">
                        {patients.map((patient) => (
                            <View key={patient.key} style={styles.patient}>
                                <View style={styles.top}>
                                    <Text style={styles.patientName}>{patient.title}</Text>
                                    <Badge tone={patient.tone}>{patient.statusLabel}</Badge>
                                </View>
                                {patient.tests.map((test, index) => (
                                    <View key={`${patient.key}-${index}`} style={styles.testRow}>
                                        <Text style={styles.testName}>{test.name}</Text>
                                        <Text style={styles.muted}>{test.statusLabel}</Text>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </Section>
                ) : (
                    <Section title="Tests booked">
                        {booking.items.map((item, index) => (
                            <Text key={`${item}-${index}`} style={styles.body}>{item}</Text>
                        ))}
                    </Section>
                )}

                <Section title="Payment">
                    {lines.map((line) => (
                        <View key={line.label} style={styles.moneyRow}>
                            <Text style={line.strong ? styles.moneyLabelStrong : styles.body}>{line.label}</Text>
                            <Text style={line.strong ? styles.moneyValueStrong : styles.moneyValue}>{line.value}</Text>
                        </View>
                    ))}
                    {payment.isLoading ? <Text style={styles.muted}>Checking your payment...</Text> : null}
                </Section>

                <Section title="Reports">
                    {reports.isLoading ? <Text style={styles.muted}>Checking for your reports...</Text> : null}
                    {reportList.length === 0 && !reports.isLoading ? (
                        <Text style={styles.muted}>Reports will appear here once the lab shares them with us.</Text>
                    ) : null}
                    {reportList.map((report, index) => <ReportRow key={report.id} report={report} index={index} />)}
                </Section>

                <View style={styles.actions}>
                    {actions.canReschedule ? (
                        <ActionButton label="Reschedule" variant="soft" onPress={() => setRescheduleOpen(true)} />
                    ) : null}
                    {booking.invoiceAvailable ? (
                        <ActionButton label="Download invoice" busyLabel="Preparing..." variant="soft" busy={invoiceBusy} onPress={openInvoice} />
                    ) : null}
                    {invoiceError ? <Notice tone="error">{invoiceError}</Notice> : null}
                    {actions.canCancel ? (
                        <ActionButton label="Cancel booking" variant="danger" onPress={() => setCancelOpen(true)} />
                    ) : null}
                </View>
            </ScrollView>

            <LabCancelSheet
                visible={cancelOpen}
                bookingId={booking.id}
                onClose={() => setCancelOpen(false)}
                onCancelled={refreshAll}
            />
            <LabRescheduleSheet
                visible={rescheduleOpen}
                bookingId={booking.id}
                onClose={() => setRescheduleOpen(false)}
                onRescheduled={() => {
                    refreshAll();
                    router.back();
                }}
            />
        </>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: Colors.surfaceSubtle },
    pad: { padding: Space[4] },
    content: { padding: Space[4], gap: Space[3] },
    card: { gap: Space[2], padding: Space[4], borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
    heading: { ...Type.bodyStrong, color: Colors.ink },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Space[2] },
    tests: { ...Type.bodyStrong, flex: 1, color: Colors.ink },
    slot: { ...Type.body, color: Colors.ink, fontVariant: ['tabular-nums'] },
    body: { ...Type.body, color: Colors.ink },
    muted: { ...Type.small, color: Colors.inkMuted, fontVariant: ['tabular-nums'] },
    patient: { gap: Space[1], paddingVertical: Space[2], borderTopWidth: 1, borderTopColor: Colors.border },
    patientName: { ...Type.bodyStrong, flex: 1, color: Colors.ink },
    testRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Space[3], minHeight: 28 },
    testName: { ...Type.body, flex: 1, color: Colors.ink },
    moneyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Space[3], minHeight: 28 },
    moneyLabelStrong: { ...Type.bodyStrong, color: Colors.ink },
    moneyValue: { ...Type.body, color: Colors.ink, fontVariant: ['tabular-nums'] },
    moneyValueStrong: { ...Type.bodyStrong, color: Colors.ink, fontVariant: ['tabular-nums'] },
    actions: { gap: Space[2], marginTop: Space[2] },
});
