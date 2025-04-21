import type { Config } from 'jest';
import { resolve } from 'path';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': resolve(__dirname, 'src/$1'), // Map @/ to the src directory
    '^d3-random$': '<rootDir>/node_modules/d3-random/dist/d3-random.min.js', // Map d3-random to its CommonJS-compatible version
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // Setup file for additional configurations
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.jest.json',
      babelConfig: 'babel.config.jest.js'
    }], 
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(d3-random|d3-array|d3-format)/)', // Transform `d3-random` and related dependencies
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // Recognize these file extensions
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  }
};

export default config;
