// Turns the lab partner's live status into one block per patient, the way the website lists it.
import { getLabStatusDisplay } from './status';
import type { Tone } from '@/lib/consult/status';
import type { LabStatusResponse } from './types';

export interface PatientTest {
    name: string;
    statusLabel: string;
    tone: Tone;
}

export interface PatientGroup {
    key: string;
    title: string;
    statusLabel: string;
    tone: Tone;
    tests: PatientTest[];
}

/**
 * Patients come back by partner id, so the names in patientDetails are what makes them readable.
 * An unnamed patient keeps its position rather than being dropped.
 */
export function patientGroups(status: LabStatusResponse | null | undefined): PatientGroup[] {
    const customers = status?.data?.customer ?? [];
    return customers.map((customer, index) => {
        const id = customer.vendor_customer_id ?? `patient-${index}`;
        const person = customer.vendor_customer_id ? status?.patientDetails?.[customer.vendor_customer_id] : undefined;
        const info = getLabStatusDisplay(customer.customer_status);
        return {
            key: id,
            title: person ? `${person.name} (${person.relation})` : `Patient ${index + 1}`,
            statusLabel: info.label,
            tone: info.tone,
            tests: (customer.test_list ?? []).map((test) => {
                const testInfo = getLabStatusDisplay(test.test_status);
                return {
                    name: test.test_name ?? 'Test',
                    statusLabel: testInfo.label,
                    tone: testInfo.tone,
                };
            }),
        };
    });
}
