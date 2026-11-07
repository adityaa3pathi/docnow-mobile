/**
 * Who is who in a call, kept free of native code so it can be tested. Room identities are
 * `doctor:<id>`, `patient:<id>` and `caretaker:<userId>`. Same rules as the website's guest.ts.
 */
export type CallParty = 'doctor' | 'patient' | 'caretaker';

export function partyOf(identity: string): CallParty | null {
  const prefix = identity.split(':', 1)[0];
  return prefix === 'doctor' || prefix === 'patient' || prefix === 'caretaker' ? prefix : null;
}

/** The viewer's own party, from the role the join call returned (`patient-audio` → patient). */
export function partyOfRole(role: string): CallParty {
  const base = role.replace(/-audio$/, '');
  return base === 'doctor' || base === 'caretaker' ? base : 'patient';
}

/** The big tile is the doctor for the patient side and the patient for the doctor; others are small. */
export function arrangeTiles<T extends { identity: string }>(remotes: T[], viewer: CallParty): { primary: T | undefined; others: T[] } {
  const want: CallParty = viewer === 'doctor' ? 'patient' : 'doctor';
  const primary = remotes.find((r) => partyOf(r.identity) === want) ?? remotes[0];
  return { primary, others: remotes.filter((r) => r !== primary) };
}

export function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}

/** Fill the box unless that would crop away more than 30%, e.g. a landscape doctor on a portrait phone. */
export function videoFit(videoW: number, videoH: number, boxW: number, boxH: number): 'cover' | 'contain' {
  if (!videoW || !videoH || !boxW || !boxH) return 'cover';
  const ratio = (videoW / videoH) / (boxW / boxH);
  return Math.min(ratio, 1 / ratio) < 0.7 ? 'contain' : 'cover';
}
