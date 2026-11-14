// The only checkout file that touches expo-location, so the tested files stay free of native code.
import * as Location from 'expo-location';

import { formatPlace, type PickedPlace } from './address';

export type Position = { latitude: number; longitude: number };

export type PositionResult = { kind: 'position'; position: Position } | { kind: 'denied' } | { kind: 'unavailable' };

/** Asks once, then reads the phone's position. A refusal is a plain answer, never an error. */
export async function currentPosition(): Promise<PositionResult> {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return { kind: 'denied' };
        const reading = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        return { kind: 'position', position: { latitude: reading.coords.latitude, longitude: reading.coords.longitude } };
    } catch {
        return { kind: 'unavailable' };
    }
}

/** The phone's own geocoder names the pinned point. Null means the person types the pincode. */
export async function describePosition(position: Position): Promise<PickedPlace | null> {
    try {
        const [place] = await Location.reverseGeocodeAsync(position);
        return place ? formatPlace(place) : null;
    } catch {
        return null;
    }
}
