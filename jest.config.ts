import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', // Map @/ to the src directory
    '^d3-random$': '<rootDir>/node_modules/d3-random/dist/d3-random.min.js', // Map d3-random to its CommonJS-compatible version
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // Setup file for additional configurations
  transform: {
    '^.+\\.tsx?$': 'babel-jest', // Use Babel to transform TypeScript/JavaScript files
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(d3-random|d3-array|d3-format)/)', // Transform `d3-random` and related dependencies
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // Recognize these file extensions
};

export default config;
