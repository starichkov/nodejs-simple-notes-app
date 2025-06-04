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
      branches: 42,
      functions: 64,
      lines: 52,
      statements: 52
    }
  },
  verbose: true
};
