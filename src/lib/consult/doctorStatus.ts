import type { DoctorMe } from './types';

export type DoctorScreen = 'apply' | 'pending' | 'rejected' | 'suspended' | 'home';

/** Which doctor screen to show. `null` means the server has no application for this user. */
export function doctorScreen(me: DoctorMe | null | undefined): DoctorScreen {
  if (!me) return 'apply';
  switch (me.status) {
    case 'PENDING': return 'pending';
    case 'REJECTED': return 'rejected';
    case 'SUSPENDED': return 'suspended';
    case 'APPROVED': return 'home';
    default: return notApproved(me.status);
  }
}

/** A status this build does not know must never unlock the approved area, so it waits on the pending screen.
 *  The `never` parameter makes a new server status a build error here instead of a silent fall-through. */
function notApproved(_unknown: never): DoctorScreen {
  return 'pending';
}
