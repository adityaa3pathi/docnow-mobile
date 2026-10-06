import type { DoctorMe } from './types';

export type DoctorScreen = 'apply' | 'pending' | 'rejected' | 'suspended' | 'home';

/** Which doctor screen to show. `null` means the server has no application for this user. */
export function doctorScreen(me: DoctorMe | null | undefined): DoctorScreen {
  if (!me) return 'apply';
  switch (me.status) {
    case 'PENDING': return 'pending';
    case 'REJECTED': return 'rejected';
    case 'SUSPENDED': return 'suspended';
    default: return 'home';
  }
}
