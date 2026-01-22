/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid|date-fns)/)',
    '/packages/context/dist/',
  ],
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.spec.ts', '!**/index.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@forge/context$': '<rootDir>/../../../packages/context/dist',
    '^uuid$': '<rootDir>/../__mocks__/uuid.ts',
  },
};
