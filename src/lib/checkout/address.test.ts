import { describe, expect, it } from 'vitest';

import {
    addressLabel,
    centreFor,
    DEFAULT_CENTRE,
    formatPlace,
    hasCoords,
    isPincode,
    readServiceability,
    serviceabilityText,
    slotCoords,
    SLOT_FALLBACK_COORDS,
    validateAddress,
} from './address';

describe('isPincode', () => {
    it('takes exactly six digits', () => {
        expect(isPincode('302021')).toBe(true);
        expect(isPincode(' 302021 ')).toBe(true);
        expect(isPincode('30202')).toBe(false);
        expect(isPincode('3020211')).toBe(false);
        expect(isPincode('30202a')).toBe(false);
        expect(isPincode('')).toBe(false);
    });
});

describe('validateAddress', () => {
    const valid = { line1: 'EWS/2/9, Ashiana Greens', city: 'Jaipur', pincode: '302021' };

    it('accepts a complete address', () => {
        expect(validateAddress(valid)).toBeNull();
    });

    it('asks for the house details first', () => {
        expect(validateAddress({ ...valid, line1: '   ' })).toBe('Please add the house, flat or building details');
    });

    it('asks for the city', () => {
        expect(validateAddress({ ...valid, city: '' })).toBe('Please add the city');
    });

    it('asks for a six-digit pincode', () => {
        expect(validateAddress({ ...valid, pincode: '3020' })).toBe('Please enter a 6-digit pincode');
    });
});

describe('addressLabel', () => {
    it('reads as the website lists it', () => {
        expect(addressLabel({ id: '1', line1: 'Flat 4', city: 'Jaipur', pincode: '302021' })).toBe('Flat 4, Jaipur - 302021');
    });

    it('leaves out the parts that are missing', () => {
        expect(addressLabel({ id: '1', line1: 'Flat 4', city: '', pincode: '' })).toBe('Flat 4');
    });
});

describe('readServiceability', () => {
    it('is yes only when the lab partner gave a zone', () => {
        expect(readServiceability({ data: { zone_id: 12 } })).toBe('yes');
        expect(readServiceability({ data: { zone_id: '12' } })).toBe('yes');
        expect(readServiceability({ data: { zone_id: null } })).toBe('no');
        expect(readServiceability({ data: {} })).toBe('no');
        expect(readServiceability(null)).toBe('no');
    });

    it('says what is happening in plain words', () => {
        expect(serviceabilityText('checking')).toContain('Checking');
        expect(serviceabilityText('yes')).toContain('We collect');
        expect(serviceabilityText('no')).toContain('may not collect');
        expect(serviceabilityText('unknown')).toBeNull();
    });
});

describe('formatPlace', () => {
    it('builds one line without repeating a part', () => {
        expect(
            formatPlace({ name: 'Ashiana Greens', street: 'Ashiana Greens', district: 'Vaishali Nagar', city: 'Jaipur', region: 'Rajasthan', postalCode: '302021' }),
        ).toEqual({
            formattedAddress: 'Ashiana Greens, Vaishali Nagar, Jaipur, Rajasthan',
            city: 'Jaipur',
            pincode: '302021',
        });
    });

    it('falls back through the wider areas for a city', () => {
        expect(formatPlace({ subregion: 'Jaipur', postalCode: '302021' }).city).toBe('Jaipur');
        expect(formatPlace({ district: 'Sanganer' }).city).toBe('Sanganer');
    });

    it('copes with a geocoder that returned nothing', () => {
        expect(formatPlace(null)).toEqual({ formattedAddress: '', city: '', pincode: '' });
    });
});

describe('coordinates', () => {
    it('centres on a saved address when it has coordinates', () => {
        expect(centreFor({ id: '1', line1: 'a', city: 'b', pincode: '302021', lat: '26.9', long: '75.8' })).toEqual({
            latitude: 26.9,
            longitude: 75.8,
        });
    });

    it('centres on the first city when there is nothing to go on', () => {
        expect(centreFor(null)).toEqual(DEFAULT_CENTRE);
        expect(centreFor({ id: '1', line1: 'a', city: 'b', pincode: '302021', lat: '0', long: '0' })).toEqual(DEFAULT_CENTRE);
    });

    it('knows whether slots can be asked for without geocoding first', () => {
        expect(hasCoords({ id: '1', line1: 'a', city: 'b', pincode: '1', lat: '26.9', long: '75.8' })).toBe(true);
        expect(hasCoords({ id: '1', line1: 'a', city: 'b', pincode: '1', lat: '  ', long: '75.8' })).toBe(false);
        expect(hasCoords(null)).toBe(false);
    });

    it('falls back to the default coordinates for the slot call', () => {
        expect(slotCoords(null)).toEqual(SLOT_FALLBACK_COORDS);
        expect(slotCoords({ id: '1', line1: 'a', city: 'b', pincode: '1', lat: '26.9', long: '75.8' })).toEqual({
            lat: '26.9',
            long: '75.8',
        });
    });
});
