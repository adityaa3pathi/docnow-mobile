import { describe, expect, it, vi } from 'vitest';
import { errorStatus, errorText, friendlyError } from './api';

vi.mock('expo-secure-store', () => ({
    getItemAsync: vi.fn(),
    setItemAsync: vi.fn(),
    deleteItemAsync: vi.fn(),
}));

describe('errorStatus', () => {
    it('extracts status code from axios error', () => {
        const error = { isAxiosError: true, response: { status: 404 } };
        expect(errorStatus(error)).toBe(404);
    });

    it('returns undefined for non-axios error', () => {
        expect(errorStatus(new Error('fail'))).toBeUndefined();
        expect(errorStatus(null)).toBeUndefined();
    });
});

describe('errorText', () => {
    it('extracts error string from response data', () => {
        const error = { isAxiosError: true, response: { data: { error: 'Doctor not found' } } };
        expect(errorText(error)).toBe('Doctor not found');
    });

    it('returns undefined if no error field in data', () => {
        const error = { isAxiosError: true, response: { data: {} } };
        expect(errorText(error)).toBeUndefined();
    });
});

describe('friendlyError', () => {
    it('returns custom message when server returns an error field', () => {
        const error = { isAxiosError: true, response: { data: { error: 'Slot has already expired' } } };
        expect(friendlyError(error)).toBe('Slot has already expired');
    });

    it('returns connection warning when axios error has no response', () => {
        const networkError = { isAxiosError: true, response: undefined };
        expect(friendlyError(networkError)).toBe('We could not reach the server. Check your connection and try again.');
    });

    it('falls back to default message when error is unexpected', () => {
        expect(friendlyError({})).toBe('Something went wrong. Please try again.');
        expect(friendlyError(null, 'Custom fallback')).toBe('Custom fallback');
    });
});
