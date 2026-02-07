import type { Config } from 'jest';

const config: Config = {
  projects: [
    // Engine tests — pure TypeScript, node environment
    {
      displayName: 'engine',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      testMatch: ['**/__tests__/**/*.test.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
    // Component tests — React/JSX, jsdom environment
    {
      displayName: 'components',
      preset: 'ts-jest',
      testEnvironment: 'jest-environment-jsdom',
      roots: ['<rootDir>/src'],
      testMatch: ['**/__tests__/**/*.test.tsx'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup-component.ts'],
    },
  ],
};

export default config;
