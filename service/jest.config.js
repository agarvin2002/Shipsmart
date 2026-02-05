module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '**/*.js',
    '!models/index.js',
    '!bin/**',
    '!database/**',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/*.test.js',
    '!jest.config.js',
    '!coverage/**'
  ],
  testMatch: ['**/__tests__/**/*.test.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)'  // Transform uuid package (it uses ES modules)
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  // Global setup runs ONCE before all tests (initializes database)
  globalSetup: '<rootDir>/__tests__/globalSetup.js',
  globalTeardown: '<rootDir>/__tests__/globalTeardown.js',
  // Per-file setup (runs before each test file)
  setupFiles: ['<rootDir>/__tests__/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setupAfterEnv.js'],
  testTimeout: 10000,
  verbose: true,
  // Run tests serially to avoid database conflicts
  maxWorkers: 1,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  globals: {
    logger: {}
  }
};
