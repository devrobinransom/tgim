import { IssueSeverity } from './types.js';

/**
 * Calculates the priority score for a cluster based on supports, report count,
 * severity of constituent issues, and volunteer verification status.
 * Returns a value scaled from 0 to 100.
 */
export function calculatePriorityScore(params: {
  supportsCount: number;
  reportsCount: number;
  averageSeverity: IssueSeverity | number;
  isVerified: boolean;
}): number {
  const w1 = 0.4;
  const w2 = 0.3;
  const w3 = 0.2;
  const w4 = 0.1;

  // 1. Supports log score
  const supportsScore = Math.log(params.supportsCount + 1);

  // 2. Reports count score (capped at 50 for scaling reasons)
  const reportsScore = Math.min(params.reportsCount, 50) / 5;

  // 3. Severity weights
  let severityWeight = 2.0; // default medium
  if (typeof params.averageSeverity === 'number') {
    severityWeight = params.averageSeverity;
  } else {
    switch (params.averageSeverity) {
      case 'low':
        severityWeight = 1.0;
        break;
      case 'medium':
        severityWeight = 2.0;
        break;
      case 'high':
        severityWeight = 3.0;
        break;
      case 'critical':
        severityWeight = 4.0;
        break;
    }
  }

  // 4. Verification Multiplier
  const verificationMultiplier = params.isVerified ? 2.0 : 0.5;

  // Calculate base score out of 10
  const rawScore = 
    w1 * supportsScore + 
    w2 * reportsScore + 
    w3 * severityWeight + 
    w4 * verificationMultiplier;

  // Scale and clamp between 0 and 100
  const scaledScore = rawScore * 15; // scalar factor to match normal ranges
  return Math.min(Math.max(Math.round(scaledScore), 0), 100);
}
