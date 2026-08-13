import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

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
export const ACTIVE_AREA_ID = process.env.EXPO_PUBLIC_DEFAULT_AREA_ID || '10000000-0000-4000-8000-000000000012';
export const ACTIVE_AREA_NAME = 'Andheri East';

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

/** Issue interests shown during onboarding. Derived from shared categories. */
export const INTEREST_CATEGORIES: { key: string; label: string; icon: IoniconName }[] = [
  { key: 'water', label: 'Water', icon: 'water' },
  { key: 'roads', label: 'Roads', icon: 'car' },
  { key: 'garbage', label: 'Garbage', icon: 'trash' },
  { key: 'health', label: 'Health', icon: 'medkit' },
  { key: 'safety', label: 'Safety', icon: 'shield' },
  { key: 'jobs', label: 'Jobs', icon: 'briefcase' },
  { key: 'transport', label: 'Transport', icon: 'bus' },
  { key: 'housing', label: 'Housing', icon: 'home' },
];
