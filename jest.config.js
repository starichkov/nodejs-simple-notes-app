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
      branches: 36,
      functions: 45,
      lines: 39,
      statements: 39
    }
  },
  verbose: true
};
