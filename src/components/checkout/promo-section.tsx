import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { LoadingBlock } from '@/components/consult/states';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import type { Offers } from '@/hooks/use-offers';
import { formatRupees } from '@/lib/consult/format';

import { Section } from './section';

/** Offers and the wallet, as the website's PromoSection shows them. Every amount is the server's. */
export function PromoSection({ offers, cartTotal, step = 3 }: { offers: Offers; cartTotal: number; step?: number | null }) {
    const { applied, available } = offers;

    return (
        <Section step={step ?? undefined} title="Offers and wallet">
            {applied ? (
                <View style={styles.applied}>
                    <View style={styles.appliedText}>
                        <Text style={styles.appliedCode}>{applied.code} applied</Text>
                        <Text style={styles.appliedSaved}>You saved {formatRupees(applied.discountAmount)}</Text>
                    </View>
                    <Pressable
                        onPress={offers.remove}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove the promo code ${applied.code}`}
                        style={styles.removeBtn}>
                        <Text style={styles.removeText}>Remove</Text>
                    </Pressable>
                </View>
            ) : (
                <>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            value={offers.code}
                            onChangeText={(text) => offers.setCode(text.toUpperCase())}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            placeholder="Enter a promo code"
                            placeholderTextColor={Colors.inkSubtle}
                            accessibilityLabel="Promo code"
                        />
                        <Pressable
                            onPress={() => void offers.apply()}
                            disabled={!offers.code || offers.checking}
                            accessibilityRole="button"
                            accessibilityLabel="Apply the promo code"
                            accessibilityState={{ busy: offers.checking, disabled: !offers.code || offers.checking }}
                            style={({ pressed }) => [styles.apply, pressed && styles.applyPressed, (!offers.code || offers.checking) && styles.off]}>
                            <Text style={styles.applyText}>{offers.checking ? 'Checking' : 'Apply'}</Text>
                        </Pressable>
                    </View>
                    {offers.error ? (
                        <Text style={styles.error} accessibilityRole="alert">
                            {offers.error}
                        </Text>
                    ) : null}

                    <Pressable
                        onPress={() => offers.setShowList(!offers.showList)}
                        accessibilityRole="button"
                        accessibilityLabel={offers.showList ? 'Hide the coupons' : 'Show the coupons'}
                        accessibilityState={{ expanded: offers.showList }}
                        style={styles.toggle}>
                        <Text style={styles.toggleText}>
                            {available.length > 0
                                ? `${available.length} ${available.length === 1 ? 'coupon' : 'coupons'} available`
                                : 'View coupons'}
                        </Text>
                    </Pressable>

                    {offers.showList ? (
                        <View style={styles.list}>
                            {offers.loadingAvailable ? <LoadingBlock label="Loading coupons" /> : null}
                            {!offers.loadingAvailable && available.length === 0 ? (
                                <Text style={styles.muted}>No coupons are available right now.</Text>
                            ) : null}
                            {available.map((promo) => {
                                const eligible = cartTotal >= promo.minOrderValue;
                                const off =
                                    promo.discountType === 'PERCENTAGE'
                                        ? `${promo.discountValue}% off`
                                        : `${formatRupees(promo.discountValue)} off`;
                                return (
                                    <Pressable
                                        key={promo.id}
                                        onPress={() => void offers.apply(promo.code)}
                                        disabled={!eligible || offers.checking}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Use ${promo.code}, ${off}`}
                                        accessibilityState={{ disabled: !eligible }}
                                        style={[styles.promo, !eligible && styles.off]}>
                                        <View style={styles.promoText}>
                                            <Text style={styles.promoCode}>{promo.code}</Text>
                                            {promo.description ? (
                                                <Text style={styles.muted} numberOfLines={2}>
                                                    {promo.description}
                                                </Text>
                                            ) : null}
                                            {promo.minOrderValue > 0 ? (
                                                <Text style={styles.muted}>
                                                    {eligible
                                                        ? `Minimum order ${formatRupees(promo.minOrderValue)}`
                                                        : `Add ${formatRupees(promo.minOrderValue - cartTotal)} more to use this`}
                                                </Text>
                                            ) : null}
                                        </View>
                                        <Text style={styles.promoOff}>{off}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    ) : null}
                </>
            )}

            {offers.walletBalance > 0 ? (
                <Pressable
                    onPress={() => offers.setUseWallet(!offers.useWallet)}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Use wallet balance, ${formatRupees(offers.walletBalance)} available`}
                    accessibilityState={{ checked: offers.useWallet }}
                    style={styles.wallet}>
                    <View style={[styles.box, offers.useWallet && styles.boxOn]} />
                    <View style={styles.walletText}>
                        <Text style={styles.walletTitle}>Use wallet balance</Text>
                        <Text style={styles.muted}>Available {formatRupees(offers.walletBalance)}</Text>
                    </View>
                </Pressable>
            ) : null}
        </Section>
    );
}

const styles = StyleSheet.create({
    inputRow: { flexDirection: 'row', gap: Space[2] },
    input: {
        ...Type.body,
        flex: 1,
        minHeight: 44,
        paddingHorizontal: Space[3],
        borderWidth: 1,
        borderColor: Colors.borderStrong,
        borderRadius: Radius.md,
        color: Colors.ink,
    },
    apply: {
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: Space[4],
        borderRadius: Radius.md,
        backgroundColor: Colors.primary,
    },
    applyPressed: { backgroundColor: Colors.primaryHover },
    applyText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.onPrimary },
    off: { opacity: 0.5 },
    error: { ...Type.small, color: Colors.dangerInk },
    toggle: { minHeight: 44, justifyContent: 'center' },
    toggleText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primary },
    list: { gap: Space[2] },
    promo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Space[3],
        padding: Space[3],
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    promoText: { flex: 1, gap: Space[1] },
    promoCode: { ...Type.small, fontFamily: Fonts.bold, color: Colors.primary },
    promoOff: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.successInk },
    muted: { ...Type.small, color: Colors.inkMuted },
    applied: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Space[3],
        padding: Space[3],
        borderRadius: Radius.md,
        backgroundColor: Colors.successSoft,
    },
    appliedText: { flex: 1, gap: Space[1] },
    appliedCode: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.successInk },
    appliedSaved: { ...Type.small, color: Colors.successInk },
    removeBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Space[2] },
    removeText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.ink },
    wallet: { flexDirection: 'row', alignItems: 'center', gap: Space[3], minHeight: 44, paddingTop: Space[2] },
    box: { width: 22, height: 22, borderRadius: Radius.sm, borderWidth: 2, borderColor: Colors.borderStrong },
    boxOn: { borderColor: Colors.primary, backgroundColor: Colors.primary },
    walletText: { flex: 1, gap: Space[1] },
    walletTitle: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.ink },
});
