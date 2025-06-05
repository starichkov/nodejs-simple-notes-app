export default {
  transform: {},
  testTimeout: 60000,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    "src/**/*.{js,jsx}",
    "!src/public/**",
    "!**/node_modules/**"
  ],
  coverageDirectory: "coverage",
  coverageThreshold: {
    global: {
      branches: 62,
      functions: 75,
      lines: 67,
      statements: 68
    }
  },
  verbose: true
};
