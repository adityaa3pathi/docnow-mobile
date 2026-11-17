import { useQuery } from '@tanstack/react-query';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SectionTitle } from '@/components/account/ui';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { account } from '@/lib/account/api';
import {
    WALLET_EMPTY_BODY,
    WALLET_EMPTY_TITLE,
    WALLET_NOTE,
    walletBalanceText,
    walletEntryView,
} from '@/lib/account/wallet';
import { friendlyError } from '@/lib/consult/api';

export default function WalletScreen() {
    const wallet = useQuery({ queryKey: ['account', 'wallet'], queryFn: account.wallet });

    if (wallet.isLoading) return <LoadingBlock label="Loading your wallet" />;
    if (wallet.error) {
        return (
            <View style={styles.pad}>
                <ErrorState message={friendlyError(wallet.error)} onRetry={() => void wallet.refetch()} />
            </View>
        );
    }

    const balance = wallet.data?.balance ?? 0;
    const entries = wallet.data?.transactions ?? [];

    return (
        <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl
                    refreshing={wallet.isRefetching}
                    onRefresh={() => void wallet.refetch()}
                    tintColor={Colors.primary}
                />
            }>
            <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Wallet balance</Text>
                <Text style={styles.balance} accessibilityLabel={`Wallet balance ${walletBalanceText(balance)}`}>
                    {walletBalanceText(balance)}
                </Text>
                <Text style={styles.balanceNote}>{WALLET_NOTE}</Text>
            </View>

            <SectionTitle>Transaction history</SectionTitle>

            {entries.length === 0 ? <EmptyState title={WALLET_EMPTY_TITLE} body={WALLET_EMPTY_BODY} /> : null}

            {entries.map((entry) => {
                const view = walletEntryView(entry);
                return (
                    <View key={entry.id} style={styles.row}>
                        <View style={styles.grow}>
                            <Text style={styles.title}>{view.title}</Text>
                            <Text style={styles.meta}>{view.meta}</Text>
                        </View>
                        <View style={styles.amountBox}>
                            <Text style={[styles.amount, view.credit ? styles.credit : styles.debit]}>
                                {view.amount}
                            </Text>
                            <Text style={styles.meta}>{view.balance}</Text>
                        </View>
                    </View>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: Colors.surfaceSubtle },
    pad: { padding: Space[4] },
    content: { padding: Space[4], gap: Space[3] },
    balanceCard: { gap: Space[1], padding: Space[6], borderRadius: Radius.lg, backgroundColor: Colors.primary },
    balanceLabel: { ...Type.small, color: Colors.onPrimary },
    balance: { ...Type.titleLg, fontFamily: Fonts.bold, color: Colors.onPrimary },
    balanceNote: { ...Type.small, color: Colors.primarySoft },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
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
    amountBox: { alignItems: 'flex-end', gap: 2 },
    amount: { ...Type.small, fontFamily: Fonts.semibold },
    credit: { color: Colors.successInk },
    debit: { color: Colors.dangerInk },
});
