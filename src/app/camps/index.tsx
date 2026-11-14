import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CampCard } from '@/components/camps/camp-card';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/consult/states';
import { LightStatusBar } from '@/components/ui/light-status-bar';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { campCityGroups, camps as campsApi, campsCountLabel } from '@/lib/camps';
import { friendlyError } from '@/lib/consult/api';
import { NO_CITY } from '@/lib/location/cities';
import { useLocationCity } from '@/lib/location/context';

/** Active camps, grouped by city with the chosen city first. Wording is the website's camps page. */
export default function CampsListScreen() {
    const { selectedCity } = useLocationCity();
    const list = useQuery({ queryKey: ['camps', 'active'], queryFn: campsApi.active, staleTime: 60_000 });
    const all = useMemo(() => list.data ?? [], [list.data]);
    const city = selectedCity && selectedCity !== NO_CITY ? selectedCity : null;
    const groups = useMemo(() => campCityGroups(all, city), [all, city]);

    return (
        <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} tintColor={Colors.primary} />
            }>
            <LightStatusBar />
            <View style={styles.band}>
                <Text style={styles.bandKicker}>Walk-in Health Checkups</Text>
                <Text style={styles.bandTitle} accessibilityRole="header">
                    Health Camps Near You
                </Text>
                <Text style={styles.bandBody}>
                    Affordable walk-in health checkups at a location near you — no home visit needed
                </Text>
                <Pressable
                    onPress={() => router.push('/location/city')}
                    accessibilityRole="button"
                    accessibilityLabel={city ? `Your city is ${city}. Change it` : 'Choose your city'}
                    style={({ pressed }) => [styles.cityButton, pressed && styles.cityPressed]}>
                    <Text style={styles.cityText}>{city ? `City: ${city}` : 'Choose your city'}</Text>
                </Pressable>
            </View>

            <View style={styles.body}>
                {list.isLoading ? <LoadingBlock label="Loading camps" /> : null}
                {list.isError ? (
                    <ErrorState message={friendlyError(list.error)} onRetry={() => void list.refetch()} />
                ) : null}

                {!list.isLoading && !list.isError && all.length === 0 ? (
                    <EmptyState
                        title="No Active Camps"
                        body="There are no health camps available right now. Check back soon — we regularly add new camps in your area."
                    />
                ) : null}

                {all.length > 0 ? (
                    <Text style={styles.count} accessibilityLiveRegion="polite">
                        {campsCountLabel(all.length)}
                    </Text>
                ) : null}

                {groups.map((group) => (
                    <View key={group.city} style={styles.group}>
                        <Text style={styles.cityHead} accessibilityRole="header">
                            {group.city}
                        </Text>
                        {group.camps.map((camp) => (
                            <CampCard key={camp.id} camp={camp} />
                        ))}
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: Colors.surfaceSubtle },
    content: { paddingBottom: Space[8] },
    band: { gap: Space[2], paddingHorizontal: Space[4], paddingTop: Space[4], paddingBottom: Space[6], backgroundColor: Colors.primaryHover },
    bandKicker: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.primarySoft },
    bandTitle: { ...Type.title, fontFamily: Fonts.bold, color: Colors.onPrimary },
    bandBody: { ...Type.small, color: Colors.primarySoft },
    cityButton: {
        alignSelf: 'flex-start',
        minHeight: 44,
        marginTop: Space[2],
        justifyContent: 'center',
        paddingHorizontal: Space[4],
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.primarySoft,
    },
    cityPressed: { backgroundColor: Colors.primary },
    cityText: { ...Type.bodyStrong, color: Colors.onPrimary },
    body: { gap: Space[3], padding: Space[4] },
    count: { ...Type.small, fontFamily: Fonts.medium, color: Colors.inkMuted },
    group: { gap: Space[3] },
    cityHead: { ...Type.bodyLg, fontFamily: Fonts.semibold, color: Colors.ink },
});
