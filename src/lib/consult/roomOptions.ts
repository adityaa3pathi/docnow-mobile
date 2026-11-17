import {
  AudioPresets,
  type ReconnectPolicy,
  type RoomConnectOptions,
  type RoomOptions,
  VideoPresets,
} from 'livekit-client';
import { ObservableReconnectPolicy } from './reconnectPolicy';

export const CONNECT_OPTIONS: RoomConnectOptions = {
  autoSubscribe: true,
};

export function buildRoomOptions(policy?: ReconnectPolicy): RoomOptions {
  return {
    adaptiveStream: true,
    dynacast: true,
    publishDefaults: {
      videoCodec: 'vp8',
      videoEncoding: VideoPresets.h540.encoding,
      audioPreset: AudioPresets.speech,
      dtx: true,
      red: true,
      simulcast: true,
    },
    videoCaptureDefaults: {
      resolution: VideoPresets.h540.resolution,
    },
    reconnectPolicy: policy ?? new ObservableReconnectPolicy(),
  };
}
