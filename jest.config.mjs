/** @type {import('jest').Config} */
const config = {
    testEnvironment: 'node',
    testTimeout: 5_000,
    collectCoverage: true,
    clearMocks: true,
    coverageDirectory: 'coverage',
    coverageProvider: 'v8',

    // exclude lib folder:
    testPathIgnorePatterns: ['./lib/', './dist/'],

    // ESM support:
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    transform: {
        '^.+\\.m?[tj]sx?$': [
            'ts-jest',
            {
                useESM: true,
            },
        ],
    },

    // Coverage:
};
export default config;
