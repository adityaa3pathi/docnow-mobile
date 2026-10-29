import { useRemoteParticipants } from '@livekit/react-native';
import { ConnectionQuality, ParticipantEvent, RemoteParticipant } from 'livekit-client';
import { useEffect, useState } from 'react';

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

export function useDoctorPresence(otherPartyName?: string): DoctorPresenceState {
  const remoteParticipants = useRemoteParticipants();
  const doctor = remoteParticipants[0] as RemoteParticipant | undefined;

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
