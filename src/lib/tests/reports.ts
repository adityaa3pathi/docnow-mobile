/** Display rules for the lab report viewer, kept apart from React so they can be tested. */
import type { ReportDetail } from './types';

/** "CBC", "CBC & Lipid Profile", or "CBC + 3 more". */
export function reportTitle(tests: string[]): string {
    if (!tests.length) return 'Lab Report';
    if (tests.length === 1) return tests[0]!;
    if (tests.length === 2) return `${tests[0]} & ${tests[1]}`;
    return `${tests[0]} + ${tests.length - 1} more`;
}

const dateFormat = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });

/** The date a patient recognises: when the lab verified it, else when we received it. */
export function reportDateLabel(r: Pick<ReportDetail, 'verifiedAt' | 'generatedAt'>): string {
    return dateFormat.format(new Date(r.verifiedAt ?? r.generatedAt));
}

/** A filename that is safe on every platform and tells the person what the file is. */
export function reportFileName(r: Pick<ReportDetail, 'id' | 'patientName' | 'verifiedAt' | 'generatedAt'>): string {
    const day = new Date(r.verifiedAt ?? r.generatedAt).toISOString().slice(0, 10);
    const who = (r.patientName ?? '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
    return ['DocNow-Report', who, day, r.id.slice(0, 8)].filter(Boolean).join('_') + '.pdf';
}

export function formatFileSize(bytes: number | null): string | null {
    if (!bytes || bytes <= 0) return null;
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
