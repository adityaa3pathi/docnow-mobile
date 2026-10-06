import axios, { AxiosError, create, InternalAxiosRequestConfig, isAxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

import { recordServerDate } from '@/lib/consult/time';

const ACCESS_KEY = 'docnow_access';
const REFRESH_KEY = 'docnow_refresh';

export const api = create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: { 'x-client-type': 'mobile' },
  timeout: 15000,
});

export async function saveTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export async function hasTokens() {
  return (await SecureStore.getItemAsync(REFRESH_KEY)) !== null;
}

let onSessionExpired: () => void = () => {};
export function setSessionExpiredHandler(fn: () => void) {
  onSessionExpired = fn;
}

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(ACCESS_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// One shared refresh call so parallel 401s do not rotate the token twice.
let refreshing: Promise<void> | null = null;

async function refreshTokens() {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  if (!refreshToken) throw new Error('No refresh token');
  const { data } = await axios.post(
    `${process.env.EXPO_PUBLIC_API_URL}/api/auth/refresh`,
    { refreshToken },
    { headers: { 'x-client-type': 'mobile' } },
  );
  await saveTokens(data.accessToken, data.refreshToken);
}

api.interceptors.response.use(
  (res) => {
    // Hold countdowns use the server clock, so a wrong phone clock cannot skew them.
    recordServerDate(res.headers?.date as string | undefined);
    return res;
  },
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthCall = original?.url?.startsWith('/api/auth/');
    if (error.response?.status !== 401 || !original || original._retried || isAuthCall) {
      throw error;
    }
    original._retried = true;
    try {
      refreshing ??= refreshTokens().finally(() => {
        refreshing = null;
      });
      await refreshing;
      return api(original);
    } catch (e) {
      // A network or server failure during refresh must not sign the user out.
      if (isAxiosError(e) && (!e.response || e.response.status >= 500)) throw error;
      await clearTokens();
      onSessionExpired();
      throw error;
    }
  },
);

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (isAxiosError(error)) return (error.response?.data as { error?: string })?.error ?? fallback;
  return fallback;
}
