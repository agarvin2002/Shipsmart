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
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFiles: ['<rootDir>/__tests__/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setupAfterEnv.js'],
  testTimeout: 10000,
  verbose: true,
  maxWorkers: '50%',
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  globals: {
    logger: {}
  }
};
