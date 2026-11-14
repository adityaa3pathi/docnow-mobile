import { describe, expect, it } from 'vitest';

import { patientGroups } from './patients';

const status = {
    data: {
        customer: [
            {
                vendor_customer_id: 'p1',
                customer_status: 'BS007',
                test_list: [{ test_name: 'Complete Blood Count', test_status: 'BS008' }],
            },
            { vendor_customer_id: 'p2', customer_status: 'BS005', test_list: [] },
        ],
    },
    patientDetails: { p1: { name: 'Asha', relation: 'Self' } },
};

describe('tests by patient', () => {
    it('names a patient we know and keeps an unknown one in place', () => {
        const groups = patientGroups(status);
        expect(groups.map((g) => g.title)).toEqual(['Asha (Self)', 'Patient 2']);
    });

    it('reads the patient and test statuses with the same mapping as the badge', () => {
        const [first] = patientGroups(status);
        expect(first.statusLabel).toBe('Sample collected');
        expect(first.tests).toEqual([{ name: 'Complete Blood Count', statusLabel: 'Sample received at lab', tone: 'info' }]);
    });

    it('returns nothing before the live status has arrived', () => {
        expect(patientGroups(null)).toEqual([]);
        expect(patientGroups({})).toEqual([]);
    });

    it('copes with a patient the partner sent no tests for', () => {
        expect(patientGroups(status)[1].tests).toEqual([]);
    });
});
