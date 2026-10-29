import { ConnectionQuality } from 'livekit-client';
import { describe, expect, it, vi } from 'vitest';

import { resolveDoctorPresence } from './useDoctorPresence';

vi.mock('@livekit/react-native', () => ({
  useRemoteParticipants: () => [],
}));

describe('resolveDoctorPresence', () => {
  it('returns waiting state when doctor has not joined yet', () => {
    const presence = resolveDoctorPresence(undefined, ConnectionQuality.Unknown, false, 'Dr. Sharma');
    expect(presence.status).toBe('waiting');
    expect(presence.statusMessage).toBe('Waiting for Dr. Sharma to join...');
    expect(presence.doctor).toBeUndefined();
  });

  it('returns disconnected state when doctor had joined but then left', () => {
    const presence = resolveDoctorPresence(undefined, ConnectionQuality.Unknown, true, 'Dr. Sharma');
    expect(presence.status).toBe('disconnected');
    expect(presence.statusMessage).toBe('Dr. Sharma has left the consultation');
  });

  it('returns present state when doctor is connected with good quality', () => {
    const mockDoctor = { identity: 'doctor-123' } as any;
    const presence = resolveDoctorPresence(mockDoctor, ConnectionQuality.Good, true, 'Dr. Sharma');
    expect(presence.status).toBe('present');
    expect(presence.statusMessage).toBe('Dr. Sharma is connected');
    expect(presence.doctor).toBe(mockDoctor);
  });

  it('returns unstable state when doctor connection quality is poor or lost', () => {
    const mockDoctor = { identity: 'doctor-123' } as any;
    const poorPresence = resolveDoctorPresence(mockDoctor, ConnectionQuality.Poor, true, 'Dr. Sharma');
    expect(poorPresence.status).toBe('unstable');
    expect(poorPresence.statusMessage).toBe("Dr. Sharma's connection is weak");

    const lostPresence = resolveDoctorPresence(mockDoctor, ConnectionQuality.Lost, true, 'Dr. Sharma');
    expect(lostPresence.status).toBe('unstable');
    expect(lostPresence.statusMessage).toBe("Dr. Sharma's connection is weak");
  });
});
