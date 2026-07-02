import { IssueSeverity } from './types.js';
/**
 * Calculates the priority score for a cluster based on supports, report count,
 * severity of constituent issues, and volunteer verification status.
 * Returns a value scaled from 0 to 100.
 */
export declare function calculatePriorityScore(params: {
    supportsCount: number;
    reportsCount: number;
    averageSeverity: IssueSeverity | number;
    isVerified: boolean;
}): number;
