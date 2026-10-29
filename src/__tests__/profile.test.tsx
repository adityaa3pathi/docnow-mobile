import { act } from 'react';
import { Alert, type AlertButton } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { cleanup, flush, render } from '@/test-utils/render';
import ProfileScreen from '@/app/(tabs)/profile';

const signOut = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'u-1', name: 'Aditya', mobile: '9876543210', role: 'USER' }, signOut }) }));
vi.mock('@/lib/api', () => ({
  api: { delete: vi.fn() },
  errorMessage: (e: { response?: { data?: { error?: string } } }, fallback: string) => e?.response?.data?.error ?? fallback,
}));
vi.mock('@/lib/push-registration', () => ({ clearPushRegistration: vi.fn(async () => {}) }));
vi.mock('@/hooks/use-doctor-me', () => ({ useDoctorMe: () => ({ isSuccess: true, data: null }) }));
vi.mock('@/components/tests/address-sheet', () => ({ AddressSheet: () => null }));
vi.mock('@/components/tests/patient-sheet', () => ({ PatientSheet: () => null }));
vi.mock('expo-router', () => ({ router: { push: vi.fn(), replace: vi.fn() } }));

/** Opens the confirmation and returns the alert's buttons. */
async function openConfirm(ui: Awaited<ReturnType<typeof render>>, alert: ReturnType<typeof vi.spyOn>) {
  await ui.press('delete-account');
  expect(alert).toHaveBeenCalledTimes(1);
  const [title, message, buttons] = alert.mock.calls[0] as [string, string, AlertButton[]];
  expect(title).toBe('Delete Account?');
  expect(message).toContain('This action is permanent.');
  return buttons;
}

describe('Profile: Delete Account', () => {
  let alert: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    alert = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    signOut.mockClear();
    vi.mocked(api.delete).mockReset();
  });
  afterEach(cleanup);

  it('asks first, then calls DELETE /api/profile and signs out', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true, message: 'Account deleted successfully' } });
    const ui = await render(<ProfileScreen />);
    expect(ui.getByTestId('delete-account').textContent).toContain('Delete Account');

    const buttons = await openConfirm(ui, alert);
    expect(buttons.map((b) => [b.text, b.style])).toEqual([
      ['Cancel', 'cancel'],
      ['Delete My Account', 'destructive'],
    ]);
    expect(api.delete).not.toHaveBeenCalled();

    await act(async () => buttons[1].onPress?.());
    await flush();
    expect(api.delete).toHaveBeenCalledWith('/api/profile');
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('does nothing when cancelled', async () => {
    const ui = await render(<ProfileScreen />);
    const buttons = await openConfirm(ui, alert);
    expect(buttons[0].onPress).toBeUndefined();
    expect(api.delete).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('stays signed in and shows the reason when the server refuses', async () => {
    vi.mocked(api.delete).mockRejectedValue({
      response: { status: 400, data: { error: 'Please complete or cancel your upcoming consultation before deleting your account' } },
    });
    const ui = await render(<ProfileScreen />);
    const buttons = await openConfirm(ui, alert);
    await act(async () => buttons[1].onPress?.());
    await flush();

    expect(signOut).not.toHaveBeenCalled();
    expect(alert).toHaveBeenLastCalledWith('Account not deleted', 'Please complete or cancel your upcoming consultation before deleting your account');
  });
});
