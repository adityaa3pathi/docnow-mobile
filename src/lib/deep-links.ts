/**
 * The `docnow://` deep-link contract shared by push notifications, SMS/WhatsApp links and the OS.
 * Pure on purpose: `+native-intent` runs before the app mounts, so nothing here may touch native modules.
 *
 *   docnow://consult/room/<consultationId>         patient enters the video room
 *   docnow://doctor/consultations/<consultationId> doctor opens the consultation workspace
 *   docnow://records/prescription/<consultationId> patient opens the issued prescription
 *   docnow://records/report/<reportId>             patient opens a lab report
 */
export const DEEP_LINK_SCHEME = 'docnow';

export type DeepLinkTarget =
    | { kind: 'consult-room'; id: string }
    | { kind: 'doctor-consultation'; id: string }
    | { kind: 'prescription'; id: string }
    | { kind: 'report'; id: string };

// Consultation ids are UUIDs; the looser pattern still refuses slashes, dots and encoded characters.
const ID = /^[A-Za-z0-9-]{1,64}$/;

const ROUTES: { prefix: readonly string[]; kind: DeepLinkTarget['kind'] }[] = [
    { prefix: ['consult', 'room'], kind: 'consult-room' },
    { prefix: ['doctor', 'consultations'], kind: 'doctor-consultation' },
    { prefix: ['records', 'prescription'], kind: 'prescription' },
    { prefix: ['records', 'report'], kind: 'report' },
];

/** Strips scheme, host-less slashes, Expo Go's `/--/` prefix, query and hash, leaving `a/b/c`. */
function pathOf(url: string): string {
    let rest = url.trim();
    const expoGo = rest.indexOf('/--/');
    if (expoGo !== -1) rest = rest.slice(expoGo + 4);
    else rest = rest.replace(new RegExp(`^${DEEP_LINK_SCHEME}:`, 'i'), '');
    rest = rest.split(/[?#]/, 1)[0] ?? '';
    return rest.replace(/^\/+/, '').replace(/\/+$/, '');
}

/** Returns the screen a link points at, or null for anything outside the contract. */
export function parseDeepLink(url: string | null | undefined): DeepLinkTarget | null {
    if (!url) return null;
    // Other schemes (https, exp, payment apps) are not ours to route; Expo Go links carry `/--/`.
    if (/^[a-z][a-z0-9+.-]*:/i.test(url.trim()) && !url.trim().toLowerCase().startsWith(`${DEEP_LINK_SCHEME}:`) && !url.includes('/--/')) {
        return null;
    }
    const parts = pathOf(url).split('/');
    for (const route of ROUTES) {
        if (parts.length !== route.prefix.length + 1) continue;
        if (!route.prefix.every((p, i) => parts[i]?.toLowerCase() === p)) continue;
        const id = parts[route.prefix.length] ?? '';
        return ID.test(id) ? { kind: route.kind, id } : null;
    }
    return null;
}

/** The in-app path a target opens. The room link lands on the booking page, which joins by itself. */
export function deepLinkPath(target: DeepLinkTarget): string {
    switch (target.kind) {
        case 'consult-room':
            return `/consult/booking/${target.id}?join=1`;
        case 'doctor-consultation':
            return `/doctor/consultations/${target.id}`;
        case 'prescription':
            return `/consult/prescription/${target.id}`;
        case 'report':
            return `/records/report/${target.id}`;
    }
}

/** The public link for a target, for the server or share sheets to send. */
export function deepLinkUrl(target: DeepLinkTarget): string {
    const segment = {
        'consult-room': 'consult/room',
        'doctor-consultation': 'doctor/consultations',
        prescription: 'records/prescription',
        report: 'records/report',
    }[target.kind];
    return `${DEEP_LINK_SCHEME}://${segment}/${target.id}`;
}

/** Reads the link out of a push payload: `{ url: 'docnow://…' }`. Anything else is ignored. */
export function targetFromNotificationData(data: unknown): DeepLinkTarget | null {
    if (!data || typeof data !== 'object') return null;
    const url = (data as { url?: unknown }).url;
    return typeof url === 'string' ? parseDeepLink(url) : null;
}
