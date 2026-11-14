/** Address text, form checks and serviceability reading. Pure, so none of it touches the map. */
import type { AddressInput, SavedAddress } from './types';

export const PINCODE_LENGTH = 6;

export function isPincode(value: string): boolean {
    return /^\d{6}$/.test(value.trim());
}

/** "EWS/2/9 Ashiana Greens, Jaipur - 302021", the way the website lists a saved address. */
export function addressLabel(address: SavedAddress): string {
    const parts = [address.line1, address.city].filter((part) => Boolean(part && part.trim()));
    const head = parts.join(', ');
    return address.pincode ? `${head} - ${address.pincode}` : head;
}

/** The first problem with the add-address form as plain text, or null when it can be saved. */
export function validateAddress(input: AddressInput): string | null {
    if (!input.line1.trim()) return 'Please add the house, flat or building details';
    if (!input.city.trim()) return 'Please add the city';
    if (!isPincode(input.pincode)) return 'Please enter a 6-digit pincode';
    return null;
}

export type Serviceable = 'unknown' | 'checking' | 'yes' | 'no';

interface ServiceabilityReply {
    data?: { zone_id?: string | number | null } | null;
}

/** The lab partner only serves a pincode it gives a zone for. */
export function readServiceability(reply: ServiceabilityReply | null | undefined): Serviceable {
    const zone = reply?.data?.zone_id;
    return zone !== undefined && zone !== null && String(zone) !== '' ? 'yes' : 'no';
}

export function serviceabilityText(state: Serviceable): string | null {
    if (state === 'checking') return 'Checking whether we collect here';
    if (state === 'yes') return 'We collect samples at this location';
    if (state === 'no') return 'We may not collect at this location. Try moving the pin.';
    return null;
}

export interface PlaceParts {
    name?: string | null;
    street?: string | null;
    district?: string | null;
    city?: string | null;
    subregion?: string | null;
    region?: string | null;
    postalCode?: string | null;
}

export interface PickedPlace {
    formattedAddress: string;
    city: string;
    pincode: string;
}

/** Builds the one-line address, city and pincode out of whatever the phone's geocoder returned. */
export function formatPlace(parts: PlaceParts | null | undefined): PickedPlace {
    const clean = (value?: string | null) => (value ?? '').trim();
    const pieces = [clean(parts?.name), clean(parts?.street), clean(parts?.district), clean(parts?.city), clean(parts?.region)];
    const seen = new Set<string>();
    const line: string[] = [];
    for (const piece of pieces) {
        if (!piece || seen.has(piece.toLowerCase())) continue;
        seen.add(piece.toLowerCase());
        line.push(piece);
    }
    return {
        formattedAddress: line.join(', '),
        city: clean(parts?.city) || clean(parts?.subregion) || clean(parts?.district) || clean(parts?.region),
        pincode: clean(parts?.postalCode),
    };
}

/** Jaipur, DocNow's first city, when there is nothing better to centre the map on. */
export const DEFAULT_CENTRE = { latitude: 26.9124, longitude: 75.7873 };
export const DEFAULT_DELTA = 0.02;

export function centreFor(address?: SavedAddress | null) {
    const lat = Number(address?.lat);
    const long = Number(address?.long);
    if (Number.isFinite(lat) && Number.isFinite(long) && lat !== 0 && long !== 0) {
        return { latitude: lat, longitude: long };
    }
    return DEFAULT_CENTRE;
}

/** Slots need coordinates; Delhi is the website's own fallback when an address has none. */
export const SLOT_FALLBACK_COORDS = { lat: '28.6139', long: '77.2090' };

export function slotCoords(address: SavedAddress | null | undefined) {
    const lat = address?.lat?.trim();
    const long = address?.long?.trim();
    return { lat: lat || SLOT_FALLBACK_COORDS.lat, long: long || SLOT_FALLBACK_COORDS.long };
}

export function hasCoords(address: SavedAddress | null | undefined): boolean {
    return Boolean(address?.lat?.trim() && address?.long?.trim());
}

export const LOCATION_DENIED =
    'DocNow could not use your location. Allow location access in Settings, or move the pin by hand.';
