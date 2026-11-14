import { describe, expect, it } from 'vitest';

import { mapLinks } from './maps';

const camp = { location: 'Town Hall, MG Road', city: 'Pune', pincode: '411001' };

describe('mapLinks', () => {
    it('uses the Apple Maps scheme on iOS', () => {
        expect(mapLinks(camp, true).primary).toBe('maps://?q=Town%20Hall%2C%20MG%20Road%2C%20Pune%2C%20411001');
    });

    it('uses the geo scheme on Android', () => {
        expect(mapLinks(camp, false).primary).toBe('geo:0,0?q=Town%20Hall%2C%20MG%20Road%2C%20Pune%2C%20411001');
    });

    it('always offers a web fallback any phone can open', () => {
        expect(mapLinks(camp, false).fallback).toBe(
            'https://www.google.com/maps/search/?api=1&query=Town%20Hall%2C%20MG%20Road%2C%20Pune%2C%20411001',
        );
    });
});
