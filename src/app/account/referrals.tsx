import { useQuery } from '@tanstack/react-query';
import { RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { SectionTitle } from '@/components/account/ui';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { ActionButton } from '@/components/doctor/ui';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { account } from '@/lib/account/api';
import {
    friendView,
    NO_REFERRALS_BODY,
    NO_REFERRALS_TITLE,
    NO_REWARDS_BODY,
    NO_REWARDS_TITLE,
    REFERRAL_INTRO,
    referralShareMessage,
    referralStatsText,
    referralSteps,
    referralSummary,
    rewardView,
} from '@/lib/account/referral';
import { friendlyError } from '@/lib/consult/api';

export default function ReferralsScreen() {
    const centre = useQuery({ queryKey: ['account', 'referrals'], queryFn: account.referrals });

    if (centre.isLoading) return <LoadingBlock label="Loading your referral code" />;
    if (centre.error || !centre.data) {
        return (
            <View style={styles.pad}>
                <ErrorState
                    message={friendlyError(centre.error, 'Could not load your referral details.')}
                    onRetry={() => void centre.refetch()}
                />
            </View>
        );
    }

    const data = centre.data;
    const stats = referralStatsText(data.stats);
    const share = () =>
        void Share.share({ message: referralShareMessage(data.referralCode, data.shareLink) }).catch(() => undefined);

    return (
        <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl
                    refreshing={centre.isRefetching}
                    onRefresh={() => void centre.refetch()}
                    tintColor={Colors.primary}
                />
            }>
            <Text style={styles.intro}>{REFERRAL_INTRO}</Text>

            <View style={styles.codeCard}>
                <Text style={styles.codeLabel}>Your referral code</Text>
                <Text style={styles.code} accessibilityLabel={`Your referral code is ${data.referralCode}`}>
                    {data.referralCode}
                </Text>
                <Text style={styles.codeNote}>{referralSummary(data.rewardsConfig)}</Text>
            </View>

            <ActionButton label="Share your code" onPress={share} />

            <View style={styles.statRow}>
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{stats.referrals}</Text>
                    <Text style={styles.statLabel}>Total referrals</Text>
                    <Text style={styles.meta}>{stats.referralsNote}</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{stats.earnings}</Text>
                    <Text style={styles.statLabel}>Referral earnings</Text>
                    <Text style={styles.meta}>{stats.earningsNote}</Text>
                </View>
            </View>

            <SectionTitle>How it works</SectionTitle>
            {referralSteps(data.rewardsConfig).map((step) => (
                <View key={step.title} style={styles.card}>
                    <Text style={styles.title}>{step.title}</Text>
                    <Text style={styles.meta}>{step.body}</Text>
                </View>
            ))}

            <SectionTitle>Referral activity</SectionTitle>
            {data.referrals.length === 0 ? (
                <EmptyState title={NO_REFERRALS_TITLE} body={NO_REFERRALS_BODY} />
            ) : (
                data.referrals.map((friend) => {
                    const view = friendView(friend);
                    return (
                        <View key={friend.id} style={styles.row}>
                            <View style={styles.grow}>
                                <Text style={styles.title}>{view.name}</Text>
                                <Text style={styles.meta}>{view.joined}</Text>
                            </View>
                            <Text style={[styles.state, view.completed ? styles.done : styles.waiting]}>
                                {view.status}
                            </Text>
                        </View>
                    );
                })
            )}

            <SectionTitle>Reward history</SectionTitle>
            {data.rewardHistory.length === 0 ? (
                <EmptyState title={NO_REWARDS_TITLE} body={NO_REWARDS_BODY} />
            ) : (
                data.rewardHistory.map((reward) => {
                    const view = rewardView(reward);
                    return (
                        <View key={reward.id} style={styles.row}>
                            <View style={styles.grow}>
                                <Text style={styles.title}>{view.title}</Text>
                                <Text style={styles.meta}>{view.when}</Text>
                            </View>
                            <Text style={styles.amount}>{view.amount}</Text>
                        </View>
                    );
                })
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: Colors.surfaceSubtle },
    pad: { padding: Space[4] },
    content: { padding: Space[4], gap: Space[3] },
    intro: { ...Type.small, color: Colors.inkMuted },
    codeCard: { gap: Space[2], padding: Space[6], borderRadius: Radius.lg, backgroundColor: Colors.primary },
    codeLabel: { ...Type.small, color: Colors.onPrimary },
    code: { ...Type.titleLg, fontFamily: Fonts.bold, letterSpacing: 4, color: Colors.onPrimary },
    codeNote: { ...Type.small, color: Colors.primarySoft },
    statRow: { flexDirection: 'row', gap: Space[3] },
    stat: {
        flex: 1,
        gap: 2,
        padding: Space[4],
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    statValue: { ...Type.title, fontFamily: Fonts.bold, color: Colors.ink },
    statLabel: { ...Type.small, fontFamily: Fonts.medium, color: Colors.ink },
    card: {
        gap: 2,
        padding: Space[4],
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Space[3],
        padding: Space[4],
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    grow: { flex: 1, gap: 2 },
    title: { ...Type.small, fontFamily: Fonts.medium, color: Colors.ink },
    meta: { ...Type.small, color: Colors.inkMuted },
    state: { ...Type.small, fontFamily: Fonts.semibold, paddingHorizontal: Space[2], paddingVertical: 4, borderRadius: Radius.full, overflow: 'hidden' },
    done: { color: Colors.successInk, backgroundColor: Colors.successSoft },
    waiting: { color: Colors.warningInk, backgroundColor: Colors.warningSoft },
    amount: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.successInk },
});
