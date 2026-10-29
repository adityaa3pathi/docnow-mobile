import { act } from 'react';
import { Alert } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { addressesApi, locationApi, slotsApi } from '@/lib/tests/api';
import type { Slot } from '@/lib/tests/types';
import { DELHI_FALLBACK, makeAddress, SLOTS } from '@/test-utils/fixtures';
import {
  advanceSeconds,
  cleanup,
  flush,
  rejectionProbe,
  render,
  stubUntracked,
} from '@/test-utils/render';
import { SlotPicker } from './slot-picker';

describe('SlotPicker Flow & Resiliency', () => {
  let selectedSlotState: Slot | null = null;
  let onSlotSelectMock: any;

  beforeEach(() => {
    selectedSlotState = null;
    onSlotSelectMock = vi.fn((slot: Slot) => {
      selectedSlotState = slot;
    });

    vi.spyOn(slotsApi, 'list').mockResolvedValue({ slots: SLOTS });
    vi.spyOn(slotsApi, 'freeze').mockResolvedValue({ success: true });
    vi.spyOn(locationApi, 'geocode').mockResolvedValue({
      lat: '19.0760',
      long: '72.8777',
      city: 'Mumbai',
      state: 'Maharashtra',
    });
    vi.spyOn(addressesApi, 'patchCoords').mockResolvedValue(undefined as any);
    vi.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(async () => {
    await cleanup();
    vi.useRealTimers();
  });

  describe('Geocoding fallback', () => {
    it('uses address coordinates directly when available without calling geocode', async () => {
      const address = makeAddress({ lat: '19.0760', long: '72.8777', pincode: '400050' });

      const screen = await render(
        <SlotPicker address={address} selectedSlot={selectedSlotState} onSlotSelect={onSlotSelectMock} />,
      );
      await flush();

      expect(locationApi.geocode).not.toHaveBeenCalled();
      expect(slotsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          lat: '19.0760',
          long: '72.8777',
          zipcode: '400050',
        }),
      );

      expect(screen.getByTestId('slot-stm-101')).toBeTruthy();
      expect(screen.getByTestId('slot-stm-102')).toBeTruthy();
      expect(screen.getByTestId('slot-stm-103')).toBeTruthy();
    });

    it('geocodes pincode and patches address coordinates when lat/long are missing', async () => {
      const address = makeAddress({ lat: undefined, long: undefined, pincode: '400050' });

      const screen = await render(
        <SlotPicker address={address} selectedSlot={selectedSlotState} onSlotSelect={onSlotSelectMock} />,
      );
      await flush();

      expect(locationApi.geocode).toHaveBeenCalledWith('400050');
      expect(addressesApi.patchCoords).toHaveBeenCalledWith('addr-1', '19.0760', '72.8777');
      expect(slotsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          lat: '19.0760',
          long: '72.8777',
          zipcode: '400050',
        }),
      );
      expect(screen.getByTestId('slot-stm-101')).toBeTruthy();
    });

    it('falls back to Delhi coordinates when geocoding fails', async () => {
      vi.spyOn(locationApi, 'geocode').mockRejectedValueOnce(new Error('Network geocode error'));
      const address = makeAddress({ lat: undefined, long: undefined, pincode: '110001' });

      const screen = await render(
        <SlotPicker address={address} selectedSlot={selectedSlotState} onSlotSelect={onSlotSelectMock} />,
      );
      await flush();

      expect(locationApi.geocode).toHaveBeenCalledWith('110001');
      expect(slotsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          lat: DELHI_FALLBACK.lat,
          long: DELHI_FALLBACK.long,
          zipcode: '110001',
        }),
      );
      expect(screen.getByTestId('slot-stm-101')).toBeTruthy();
    });

    it('falls back to Delhi coordinates when geocoding times out after 8s', async () => {
      vi.useFakeTimers();

      // Geocode promise that never settles
      vi.spyOn(locationApi, 'geocode').mockImplementation(() => new Promise(() => {}));
      const address = makeAddress({ lat: undefined, long: undefined, pincode: '560001' });

      await render(
        <SlotPicker address={address} selectedSlot={selectedSlotState} onSlotSelect={onSlotSelectMock} />,
      );

      // Advance timers past the 8000ms timeout
      await act(async () => {
        await vi.advanceTimersByTimeAsync(8100);
      });
      await flush();

      expect(slotsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          lat: DELHI_FALLBACK.lat,
          long: DELHI_FALLBACK.long,
          zipcode: '560001',
        }),
      );
    });
  });

  describe('Slot freeze & 180s silent re-freeze countdown', () => {
    it('freezes slot, counts down from 15m, and silently re-freezes at 3 minutes remaining', async () => {
      vi.useFakeTimers();
      const address = makeAddress();

      const screen = await render(
        <SlotPicker address={address} selectedSlot={selectedSlotState} onSlotSelect={onSlotSelectMock} />,
      );
      await flush();

      // 1. Initially no countdown banner
      expect(screen.queryByTestId('slot-freeze-countdown')).toBeNull();

      // 2. Click slot stm-101
      await screen.press('slot-stm-101');
      await flush();

      expect(slotsApi.freeze).toHaveBeenCalledTimes(1);
      expect(slotsApi.freeze).toHaveBeenCalledWith('stm-101');
      expect(onSlotSelectMock).toHaveBeenCalledWith(
        expect.objectContaining({ stm_id: 'stm-101' }),
        expect.any(String),
      );

      // 3. Countdown banner appears with 15:00
      const countdownEl = screen.getByTestId('slot-freeze-countdown');
      expect(countdownEl.textContent).toContain('15:00');

      // 4. Advance 12 minutes (720 seconds) to reach 3 minutes remaining (180s)
      await advanceSeconds(720);

      // Banner switches to warning treatment at 180s
      expect(screen.getByTestId('slot-freeze-countdown').textContent).toContain('03:00');
      expect(screen.getByTestId('slot-freeze-countdown').textContent).toContain('Expiring Soon');

      // Silent re-freeze triggered at 180s
      expect(slotsApi.freeze).toHaveBeenCalledTimes(2);
      expect(slotsApi.freeze).toHaveBeenLastCalledWith('stm-101');

      // 5. Advance 1 more second to 179s - freeze should NOT be called again
      await advanceSeconds(1);
      expect(screen.getByTestId('slot-freeze-countdown').textContent).toContain('02:59');
      expect(slotsApi.freeze).toHaveBeenCalledTimes(2);

      // 6. Advance remaining 179 seconds to 0s (expiry)
      await advanceSeconds(179);

      // Slot is released, user is alerted, countdown banner disappears
      expect(Alert.alert).toHaveBeenCalledWith(
        'Slot Released',
        'Your slot reservation has expired. Please select a slot again.',
      );
      expect(screen.queryByTestId('slot-freeze-countdown')).toBeNull();
    });

    it('swallows silent re-freeze rejection without crashing or unhandled rejection (Finding F3)', async () => {
      vi.useFakeTimers();
      const address = makeAddress();

      const probe = rejectionProbe(new Error('Network freeze failure'));
      let callCount = 0;
      stubUntracked(slotsApi, 'freeze', (async () => {
        callCount += 1;
        if (callCount === 1) return { success: true };
        return probe.promise;
      }) as any);

      const screen = await render(
        <SlotPicker address={address} selectedSlot={selectedSlotState} onSlotSelect={onSlotSelectMock} />,
      );
      await flush();

      await screen.press('slot-stm-101');
      await flush();

      // Fast-forward to 180s mark to trigger silent re-freeze
      await advanceSeconds(720);

      // Verify rejection was swallowed by .catch() in slot-picker
      expect(callCount).toBe(2);
      expect(probe.handled).toBe(true);
    });

    it('shows alert and does not start countdown when initial slot freeze fails', async () => {
      vi.spyOn(slotsApi, 'freeze').mockRejectedValueOnce({
        response: { data: { message: 'Slot already taken by another user' } },
      });
      const address = makeAddress();

      const screen = await render(
        <SlotPicker address={address} selectedSlot={selectedSlotState} onSlotSelect={onSlotSelectMock} />,
      );
      await flush();

      await screen.press('slot-stm-101');
      await flush();

      expect(Alert.alert).toHaveBeenCalledWith('Slot Unavailable', 'Slot already taken by another user');
      expect(screen.queryByTestId('slot-freeze-countdown')).toBeNull();
      expect(onSlotSelectMock).not.toHaveBeenCalled();
    });
  });
});
