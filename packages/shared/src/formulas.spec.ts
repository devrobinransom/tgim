import { calculatePriorityScore } from './formulas.js';

describe('calculatePriorityScore', () => {
  it('should return low score for low support unverified clusters', () => {
    const score = calculatePriorityScore({
      supportsCount: 0,
      reportsCount: 1,
      averageSeverity: 'low',
      isVerified: false,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(20);
  });

  it('should return high score for high support verified critical clusters', () => {
    const score = calculatePriorityScore({
      supportsCount: 1000,
      reportsCount: 15,
      averageSeverity: 'critical',
      isVerified: true,
    });
    expect(score).toBeGreaterThanOrEqual(70);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should clamp scores to 100 maximum', () => {
    const score = calculatePriorityScore({
      supportsCount: 1000000,
      reportsCount: 100,
      averageSeverity: 'critical',
      isVerified: true,
    });
    expect(score).toBe(100);
  });
});
