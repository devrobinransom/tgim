/** Jest configuration for the mobile app QA layer (jest-expo). */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
};