/**
 * The camp address as map links. A geo or maps scheme opens the phone's own map app; the https
 * link is the fallback for a phone with no map app installed.
 */
import { campAddress } from './camps';
import type { CampDetail } from './types';

export interface MapLinks {
    /** The native map app's own scheme. */
    primary: string;
    /** Google Maps on the web, which every phone can open. */
    fallback: string;
}

export function mapLinks(camp: Pick<CampDetail, 'location' | 'city' | 'pincode'>, ios: boolean): MapLinks {
    const query = encodeURIComponent(campAddress(camp));
    return {
        primary: ios ? `maps://?q=${query}` : `geo:0,0?q=${query}`,
        fallback: `https://www.google.com/maps/search/?api=1&query=${query}`,
    };
}
