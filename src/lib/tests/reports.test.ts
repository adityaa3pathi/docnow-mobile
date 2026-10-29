import { describe, expect, it } from 'vitest';

import { formatFileSize, reportDateLabel, reportFileName, reportTitle } from './reports';

describe('lab report display', () => {
    it('titles a report by its tests', () => {
        expect(reportTitle([])).toBe('Lab Report');
        expect(reportTitle(['CBC'])).toBe('CBC');
        expect(reportTitle(['CBC', 'Lipid Profile'])).toBe('CBC & Lipid Profile');
        expect(reportTitle(['CBC', 'Lipid Profile', 'HbA1c', 'TSH'])).toBe('CBC + 3 more');
    });

    it('dates it by lab verification, in Indian time, falling back to when it arrived', () => {
        // 20:00 UTC on the 27th is the 28th in India.
        expect(reportDateLabel({ verifiedAt: '2026-10-27T20:00:00Z', generatedAt: '2026-10-01T00:00:00Z' })).toBe('28 Oct 2026');
        expect(reportDateLabel({ verifiedAt: null, generatedAt: '2026-10-01T06:00:00Z' })).toBe('1 Oct 2026');
    });

    it('builds a safe, descriptive PDF file name', () => {
        expect(
            reportFileName({ id: '3f2b8c1e-9a4d', patientName: 'Asha  K/Rao', verifiedAt: '2026-10-28T08:00:00Z', generatedAt: '2026-10-27T00:00:00Z' }),
        ).toBe('DocNow-Report_Asha-K-Rao_2026-10-28_3f2b8c1e.pdf');
        expect(reportFileName({ id: 'abcdef123456', patientName: null, verifiedAt: null, generatedAt: '2026-10-27T00:00:00Z' })).toBe(
            'DocNow-Report_2026-10-27_abcdef12.pdf',
        );
    });

    it('shows file size only when known', () => {
        expect(formatFileSize(null)).toBeNull();
        expect(formatFileSize(300)).toBe('1 KB');
        expect(formatFileSize(250 * 1024)).toBe('250 KB');
        expect(formatFileSize(3.4 * 1024 * 1024)).toBe('3.4 MB');
    });
});
