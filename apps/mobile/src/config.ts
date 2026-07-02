import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Resolve the API base URL. On a physical device `localhost` points at the
 * phone, not your dev machine, so we fall back to the Expo host IP that Metro
 * already knows. Override via app.json → expo.extra.apiBaseUrl or EXPO_PUBLIC_API_URL.
 */
function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;

  const fromExtra = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
    ?.apiBaseUrl;

  // Derive the dev-machine host from the Metro bundler URL for real devices.
  const hostUri = Constants.expoConfig?.hostUri;
  const devHost = hostUri?.split(':')[0];
  if (devHost && Platform.OS !== 'web') {
    return `http://${devHost}:3000`;
  }

  return fromExtra ?? 'http://localhost:3000';
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * The build is locked to Mumbai Suburban District (see MEMORY.md). These are the
 * seed area id (matching the in-memory API) and the six target pincodes.
 */
export const ACTIVE_AREA_ID = 'ward-12-id';
export const ACTIVE_AREA_NAME = 'Mumbai South Central';

export const SEED_PINCODES = [
  '400049',
  '400053',
  '400054',
  '400058',
  '400064',
  '400092',
] as const;

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' },
] as const;
