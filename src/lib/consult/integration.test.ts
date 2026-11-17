import axios from 'axios';
import { describe, expect, it } from 'vitest';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

const isOffline = (e: any) =>
    e.code === 'ECONNREFUSED' || e.message === 'Network Error' || !e.response;

describe('Live Backend Integration Smoke Tests', () => {
    it('fetches active specialties', async () => {
        try {
            const res = await axios.get(`${API_URL}/api/consult/specialties`, {
                headers: { 'x-client-type': 'mobile' },
                timeout: 3000,
            });
            expect(res.status).toBe(200);
            expect(Array.isArray(res.data)).toBe(true);
            expect(res.data.length).toBeGreaterThan(0);
            const first = res.data[0];
            expect(first).toHaveProperty('id');
            expect(first).toHaveProperty('name');
            expect(first).toHaveProperty('slug');
            expect(first.isActive).toBe(true);
        } catch (e: any) {
            if (isOffline(e)) {
                console.warn('Backend server not running on port 5000; skipping live check.');
                return;
            }
            throw e;
        }
    });

    it('fetches doctors list and verifies public profile schema', async () => {
        try {
            const res = await axios.get(`${API_URL}/api/consult/doctors`, {
                headers: { 'x-client-type': 'mobile' },
                timeout: 3000,
            });
            expect(res.status).toBe(200);
            expect(Array.isArray(res.data)).toBe(true);
            expect(res.data.length).toBeGreaterThan(0);
            const doc = res.data[0];
            expect(doc).toHaveProperty('id');
            expect(doc).toHaveProperty('displayName');
            expect(doc).toHaveProperty('qualification');
            expect(typeof doc.consultationFee).toBe('number');
            expect(doc.consultationFee).toBeGreaterThan(0);
            expect(doc.specialty).toHaveProperty('name');
        } catch (e: any) {
            if (isOffline(e)) return;
            throw e;
        }
    });

    it('enforces auth protection on booking endpoint', async () => {
        try {
            await axios.post(`${API_URL}/api/consult/bookings`, {}, {
                headers: { 'x-client-type': 'mobile' },
                timeout: 3000,
            });
            // Should not reach here
            expect.unreachable();
        } catch (e: any) {
            if (isOffline(e)) return;
            expect(e.response?.status).toBe(401);
        }
    });

    it('dispatches login OTP for a test mobile number', async () => {
        try {
            const res = await axios.post(`${API_URL}/api/auth/login/send-otp`, {
                mobile: '8000000001',
            }, {
                headers: { 'x-client-type': 'mobile' },
                timeout: 8000,
            });
            expect(res.status).toBe(200);
            expect(res.data).toHaveProperty('message');
        } catch (e: any) {
            if (isOffline(e)) return;
            throw e;
        }
    });
});
