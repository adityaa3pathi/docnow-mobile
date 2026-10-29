import NetInfo from '@react-native-community/netinfo';
import { useRoomContext } from '@livekit/react-native';
import { ConnectionQuality, Participant, RoomEvent, Track } from 'livekit-client';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface NetworkAdaptationOptions {
  /** How long connection must remain poor before auto-switching to audio-only (ms). Default: 6000 */
  degradeThresholdMs?: number;
  /** Grace period after user taps "Try Video Again" before poor quality can trigger degradation again (ms). Default: 10000 */
  gracePeriodMs?: number;
}

export interface NetworkAdaptationState {
  isAudioOnlyDegraded: boolean;
  isOffline: boolean;
  quality: ConnectionQuality;
  tryVideoAgain: () => Promise<void>;
}

export function useNetworkAdaptation(options: NetworkAdaptationOptions = {}): NetworkAdaptationState {
  const { degradeThresholdMs = 6000, gracePeriodMs = 10000 } = options;
  const room = useRoomContext();

  const [isAudioOnlyDegraded, setIsAudioOnlyDegraded] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [quality, setQuality] = useState<ConnectionQuality>(ConnectionQuality.Unknown);

  const degradeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inGracePeriodRef = useRef<boolean>(false);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Monitor NetInfo for complete network outage
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const clearDegradeTimer = useCallback(() => {
    if (degradeTimerRef.current) {
      clearTimeout(degradeTimerRef.current);
      degradeTimerRef.current = null;
    }
  }, []);

  const triggerDegradation = useCallback(async () => {
    clearDegradeTimer();
    setIsAudioOnlyDegraded(true);

    if (room?.localParticipant) {
      try {
        await room.localParticipant.setCameraEnabled(false);
      } catch {
        // Camera disable failed or already off
      }
      try {
        if ('setAttributes' in room.localParticipant && typeof room.localParticipant.setAttributes === 'function') {
          await room.localParticipant.setAttributes({ net: 'audio-only' });
        }
      } catch {
        // Suppress attribute error
      }
    }
  }, [clearDegradeTimer, room]);

  const tryVideoAgain = useCallback(async () => {
    clearDegradeTimer();
    setIsAudioOnlyDegraded(false);

    // Enter grace period to allow video bitrates to ramp up
    inGracePeriodRef.current = true;
    if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    graceTimerRef.current = setTimeout(() => {
      inGracePeriodRef.current = false;
    }, gracePeriodMs);

    if (room?.localParticipant) {
      try {
        await room.localParticipant.setCameraEnabled(true);
      } catch {
        // Camera enable failed
      }
      try {
        if ('setAttributes' in room.localParticipant && typeof room.localParticipant.setAttributes === 'function') {
          await room.localParticipant.setAttributes({ net: 'normal' });
        }
      } catch {
        // Suppress attribute error
      }
    }
  }, [clearDegradeTimer, gracePeriodMs, room]);

  // Listen to Room events for local connection quality and stream state
  useEffect(() => {
    if (!room) return;

    const handleQualityChanged = (newQuality: ConnectionQuality, p: Participant) => {
      if (p !== room.localParticipant) return;
      setQuality(newQuality);

      if (inGracePeriodRef.current) {
        return;
      }

      if (newQuality === ConnectionQuality.Poor || newQuality === ConnectionQuality.Lost) {
        if (!degradeTimerRef.current && !isAudioOnlyDegraded) {
          degradeTimerRef.current = setTimeout(() => {
            void triggerDegradation();
          }, degradeThresholdMs);
        }
      } else if (newQuality === ConnectionQuality.Good || newQuality === ConnectionQuality.Excellent) {
        clearDegradeTimer();
      }
    };

    const handleStreamStateChanged = (
      _pub: unknown,
      streamState: Track.StreamState,
      p: Participant,
    ) => {
      if (p !== room.localParticipant) return;
      if (inGracePeriodRef.current) return;

      if (streamState === Track.StreamState.Paused && !isAudioOnlyDegraded) {
        // Track paused by SFU due to congestion
        void triggerDegradation();
      }
    };

    room.on(RoomEvent.ConnectionQualityChanged, handleQualityChanged);
    room.on(RoomEvent.TrackStreamStateChanged, handleStreamStateChanged);

    return () => {
      room.off(RoomEvent.ConnectionQualityChanged, handleQualityChanged);
      room.off(RoomEvent.TrackStreamStateChanged, handleStreamStateChanged);
      clearDegradeTimer();
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    };
  }, [clearDegradeTimer, degradeThresholdMs, isAudioOnlyDegraded, room, triggerDegradation]);

  return {
    isAudioOnlyDegraded,
    isOffline,
    quality,
    tryVideoAgain,
  };
}
