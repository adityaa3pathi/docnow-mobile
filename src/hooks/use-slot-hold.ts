import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
    addresses as addressApi,
    checkoutSlots,
    FREEZE_DURATION_MS,
    hasCoords,
    HOLD_EXPIRED,
    holdLevel,
    location as locationApi,
    secondsLeft,
    shouldRefreeze,
    slotCoords,
    type HoldLevel,
    type SavedAddress,
} from '@/lib/checkout';
import { friendlyError } from '@/lib/consult/api';
import { serverNow } from '@/lib/consult/time';
import type { LabSlot } from '@/lib/lab/types';

/**
 * Coordinates for the slot call. A saved address without them is geocoded from its pincode and
 * the result is written back, exactly as the website's cart does.
 */
function useAddressCoords(address: SavedAddress | null) {
    return useQuery({
        queryKey: ['checkout', 'coords', address?.id, address?.pincode],
        enabled: Boolean(address),
        staleTime: Infinity,
        queryFn: async () => {
            if (!address) return slotCoords(null);
            if (hasCoords(address)) return slotCoords(address);
            try {
                const geo = await locationApi.geocodePincode(address.pincode);
                if (geo.lat && geo.long) {
                    void addressApi.saveCoords(address.id, geo.lat, geo.long).catch(() => undefined);
                    return { lat: geo.lat, long: geo.long };
                }
            } catch {
                // Falls back to the website's own default coordinates below.
            }
            return slotCoords(address);
        },
    });
}

export interface SlotHold {
    slots: LabSlot[];
    loadingSlots: boolean;
    slotsError: string | null;
    refreshSlots: () => void;
    slot: LabSlot | null;
    selectSlot: (slot: LabSlot) => void;
    locked: boolean;
    freezing: boolean;
    secondsRemaining: number;
    level: HoldLevel;
    lock: () => Promise<void>;
    notice: string | null;
    clearNotice: () => void;
    /** Called when the address or the date changes, so a held slot is never paid for twice. */
    release: () => void;
}

/** The slot list plus its 15-minute hold, with the website's auto-renew and countdown. */
export function useSlotHold(address: SavedAddress | null, date: string): SlotHold {
    const coords = useAddressCoords(address);
    const [slot, setSlot] = useState<LabSlot | null>(null);
    const [locked, setLocked] = useState(false);
    const [freezing, setFreezing] = useState(false);
    const [expiresAt, setExpiresAt] = useState<number | null>(null);
    const [secondsRemaining, setSeconds] = useState(0);
    const [notice, setNotice] = useState<string | null>(null);
    const refreezeAsked = useRef(false);

    const query = useQuery({
        queryKey: ['checkout', 'slots', address?.id, coords.data?.lat, coords.data?.long, address?.pincode, date],
        enabled: Boolean(address && coords.data && date),
        staleTime: 60_000,
        retry: false,
        queryFn: () =>
            checkoutSlots.list({
                lat: coords.data!.lat,
                long: coords.data!.long,
                zipcode: address!.pincode,
                date,
            }),
    });

    const forgetHold = useCallback(() => {
        setSlot(null);
        setLocked(false);
        setExpiresAt(null);
        setSeconds(0);
    }, []);

    const release = useCallback(() => {
        forgetHold();
        refreezeAsked.current = false;
    }, [forgetHold]);

    // A different address or day means different slots, so any hold on the old one is dropped.
    const [heldFor, setHeldFor] = useState(`${address?.id ?? ''}:${date}`);
    const wantedFor = `${address?.id ?? ''}:${date}`;
    if (heldFor !== wantedFor) {
        setHeldFor(wantedFor);
        forgetHold();
    }

    const freeze = useCallback(async (slotId: string) => {
        await checkoutSlots.freeze(slotId);
        setExpiresAt(serverNow() + FREEZE_DURATION_MS);
        refreezeAsked.current = false;
    }, []);

    const renew = useCallback(
        async (slotId: string) => {
            try {
                await freeze(slotId);
            } catch {
                // Silent: the original countdown keeps running and the person can lock again.
            }
        },
        [freeze],
    );

    useEffect(() => {
        if (!locked || expiresAt === null || !slot) return;
        const tick = () => {
            const left = secondsLeft(expiresAt, serverNow());
            setSeconds(left);
            if (shouldRefreeze(left, refreezeAsked.current)) {
                refreezeAsked.current = true;
                void renew(slot.id);
            }
            if (left <= 0) {
                setLocked(false);
                setExpiresAt(null);
                setNotice(HOLD_EXPIRED);
            }
        };
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [locked, expiresAt, slot, renew]);

    const selectSlot = useCallback((next: LabSlot) => {
        setSlot(next);
        setLocked(false);
        setExpiresAt(null);
        setSeconds(0);
        refreezeAsked.current = false;
    }, []);

    const lock = useCallback(async () => {
        if (!slot || locked || freezing) return;
        setFreezing(true);
        setNotice(null);
        try {
            await freeze(slot.id);
            setLocked(true);
        } catch {
            setLocked(false);
            setExpiresAt(null);
            setNotice('We could not hold that slot. Please try another one.');
        } finally {
            setFreezing(false);
        }
    }, [slot, locked, freezing, freeze]);

    return {
        slots: query.data ?? [],
        loadingSlots: query.isFetching || coords.isLoading,
        slotsError: query.error ? friendlyError(query.error, 'We could not load slots for this date.') : null,
        refreshSlots: () => void query.refetch(),
        slot,
        selectSlot,
        locked,
        freezing,
        secondsRemaining,
        level: holdLevel(locked, secondsRemaining),
        lock,
        notice,
        clearNotice: () => setNotice(null),
        release,
    };
}
