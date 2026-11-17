import { useRemoteParticipants } from '@livekit/react-native';
import { ConnectionQuality, ParticipantEvent, RemoteParticipant } from 'livekit-client';
import { useEffect, useState } from 'react';

import { partyOf, type CallParty } from './family';

export type DoctorPresenceStatus = 'waiting' | 'present' | 'unstable' | 'disconnected';

export interface DoctorPresenceState {
  status: DoctorPresenceStatus;
  doctor?: RemoteParticipant;
  statusMessage: string;
}

export function resolveDoctorPresence(
  doctor: RemoteParticipant | undefined,
  quality: ConnectionQuality,
  hadDoctorJoined: boolean,
  otherPartyName?: string,
): DoctorPresenceState {
  const name = otherPartyName || 'Doctor';

  if (!doctor) {
    if (hadDoctorJoined) {
      return {
        status: 'disconnected',
        doctor: undefined,
        statusMessage: `${name} has left the consultation`,
      };
    }
    return {
      status: 'waiting',
      doctor: undefined,
      statusMessage: `Waiting for ${name} to join...`,
    };
  }

  if (quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost) {
    return {
      status: 'unstable',
      doctor,
      statusMessage: `${name}'s connection is weak`,
    };
  }

  return {
    status: 'present',
    doctor,
    statusMessage: `${name} is connected`,
  };
}

/**
 * The person this viewer is waiting for, by room identity: the doctor for the patient side
 * (patient or caregiver), the patient side for the doctor. Rooms from before three-way calls
 * carry bare user ids, so then the first remote person is used, as before.
 */
export function pickOtherParty<T extends { identity: string }>(remotes: T[], viewer: CallParty): T | undefined {
  const prefixed = remotes.some((r) => partyOf(r.identity) !== null);
  if (!prefixed) return remotes[0];
  if (viewer === 'doctor') return remotes.find((r) => partyOf(r.identity) === 'patient') ?? remotes.find((r) => partyOf(r.identity) === 'caretaker');
  return remotes.find((r) => partyOf(r.identity) === 'doctor');
}

export function useDoctorPresence(otherPartyName?: string, viewer: CallParty = 'patient'): DoctorPresenceState {
  const remoteParticipants = useRemoteParticipants();
  const doctor = pickOtherParty(remoteParticipants, viewer) as RemoteParticipant | undefined;

  const [hadDoctorJoined, setHadDoctorJoined] = useState(false);
  if (doctor && !hadDoctorJoined) {
    setHadDoctorJoined(true);
  }

  const [quality, setQuality] = useState<ConnectionQuality>(doctor?.connectionQuality ?? ConnectionQuality.Unknown);

  useEffect(() => {
    if (!doctor) return;

    const handleQuality = (q: ConnectionQuality) => {
      setQuality(q);
    };

    doctor.on(ParticipantEvent.ConnectionQualityChanged, handleQuality);
    return () => {
      doctor.off(ParticipantEvent.ConnectionQualityChanged, handleQuality);
    };
  }, [doctor]);

  const effectiveQuality = doctor ? (doctor.connectionQuality ?? quality) : quality;

  return resolveDoctorPresence(doctor, effectiveQuality, hadDoctorJoined, otherPartyName);
}
