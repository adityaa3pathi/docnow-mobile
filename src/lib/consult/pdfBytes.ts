/** Pure byte checks for downloaded files, kept out of pdf.ts so they can be tested without native modules. */

/** "%PDF" — every PDF starts with it, so an HTML error page or an empty body is caught before sharing. */
const MAGIC = [0x25, 0x50, 0x44, 0x46];

export function looksLikePdf(data: ArrayBuffer): boolean {
    if (data.byteLength <= MAGIC.length) return false;
    const head = new Uint8Array(data, 0, MAGIC.length);
    return MAGIC.every((byte, i) => head[i] === byte);
}

export const NOT_A_PDF = 'That download was not a prescription PDF, so nothing was saved. Please try again in a moment.';

export class NotAPdfError extends Error {
    constructor() {
        super(NOT_A_PDF);
        this.name = 'NotAPdfError';
    }
}

/** friendlyError() replaces any non-network message with its fallback, so this one has to be read out first. */
export function notAPdfMessage(error: unknown): string | null {
    return error instanceof NotAPdfError ? NOT_A_PDF : null;
}
