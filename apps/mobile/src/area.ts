import { ACTIVE_AREA_ID, ACTIVE_AREA_NAME } from './config';
import { useSession } from './store/session';

/**
 * Resolve the user's active locality. During onboarding the user can pick an
 * area; before then the build default (Andheri East) applies.
 */
export function useActiveArea() {
  const { areaId, areaName } = useSession();
  return {
    areaId: areaId || ACTIVE_AREA_ID,
    areaName: areaName || ACTIVE_AREA_NAME,
  };
}