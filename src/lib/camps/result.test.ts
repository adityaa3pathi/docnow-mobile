import { describe, expect, it } from 'vitest';

import { campResultView } from './result';

describe('campResultView', () => {
    it('celebrates only a confirmed registration', () => {
        expect(campResultView('confirmed')).toMatchObject({ title: 'Registration confirmed!', tone: 'success' });
    });

    it('says a pending one is still being confirmed, never that it is done', () => {
        const view = campResultView('pending');
        expect(view.tone).toBe('warning');
        expect(view.title).not.toContain('confirmed!');
    });

    it('explains a refund and a payment that never completed', () => {
        expect(campResultView('refunded').tone).toBe('danger');
        expect(campResultView('not_paid')).toMatchObject({ title: 'Payment not completed', tone: 'muted' });
    });
});
