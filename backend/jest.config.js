/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/__tests__'],
  testMatch: ['**/*.test.ts'],
  // Use a separate tsconfig for tests so @types/jest doesn't bleed into the
  // production build, and test files are excluded from tsc output.
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  // Silence console output during tests; errors still surface via assertions
  silent: false,
}
