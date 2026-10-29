import { describe, expect, it } from 'vitest';
import { ObservableReconnectPolicy } from './reconnectPolicy';
import { CONNECT_OPTIONS, buildRoomOptions } from './roomOptions';

describe('roomOptions', () => {
  it('builds options with adaptiveStream, dynacast, and vp8 540p defaults', () => {
    const policy = new ObservableReconnectPolicy();
    const opts = buildRoomOptions(policy);

    expect(opts.adaptiveStream).toBe(true);
    expect(opts.dynacast).toBe(true);
    expect(opts.reconnectPolicy).toBe(policy);
    expect(opts.publishDefaults?.videoCodec).toBe('vp8');
    expect(opts.publishDefaults?.simulcast).toBe(true);
    expect(opts.publishDefaults?.dtx).toBe(true);
    expect(opts.publishDefaults?.red).toBe(true);
    expect(opts.videoCaptureDefaults?.resolution?.width).toBe(960);
    expect(opts.videoCaptureDefaults?.resolution?.height).toBe(540);
  });

  it('exposes autoSubscribe in CONNECT_OPTIONS', () => {
    expect(CONNECT_OPTIONS.autoSubscribe).toBe(true);
  });
});
