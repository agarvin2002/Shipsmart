module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'services/**/*.js',
    'helpers/**/*.js',
    'lib/**/*.js',
    'presenters/**/*.js',
    '!**/node_modules/**'
  ],
  testMatch: ['**/__tests__/unit/**/*.test.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)'
  ],
  moduleNameMapper: {
    '^uuid$': require.resolve('uuid')
  },
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  setupFiles: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 10000,
  verbose: true,
  maxWorkers: '50%',
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
