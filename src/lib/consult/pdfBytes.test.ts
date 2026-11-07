import { describe, expect, it } from 'vitest';
import { NOT_A_PDF, NotAPdfError, looksLikePdf, notAPdfMessage } from './pdfBytes';

const bytesOf = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer;

describe('pdf bytes', () => {
    it('accepts a real PDF header', () => {
        expect(looksLikePdf(bytesOf('%PDF-1.7\n1 0 obj'))).toBe(true);
    });
    it('refuses an empty body, a bare header and anything that is not a PDF', () => {
        expect(looksLikePdf(new ArrayBuffer(0))).toBe(false);
        expect(looksLikePdf(bytesOf('%PDF'))).toBe(false);
        expect(looksLikePdf(bytesOf('<!doctype html><p>502 Bad Gateway</p>'))).toBe(false);
        expect(looksLikePdf(bytesOf('{"error":"No prescription yet"}'))).toBe(false);
        expect(looksLikePdf(bytesOf('%pdf-1.7 lower case'))).toBe(false);
    });
    it('reads its own message out and leaves other errors alone', () => {
        expect(new NotAPdfError().message).toBe(NOT_A_PDF);
        expect(notAPdfMessage(new NotAPdfError())).toBe(NOT_A_PDF);
        expect(notAPdfMessage(new Error('timeout'))).toBeNull();
        expect(notAPdfMessage(undefined)).toBeNull();
    });
});
