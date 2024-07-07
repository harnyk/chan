/** @type {import('jest').Config} */
const config = {
    testEnvironment: 'node',
    testTimeout: 30_000,
    collectCoverage: true,
    clearMocks: true,
    coverageDirectory: 'coverage',
    coverageProvider: 'v8',

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
    coveragePathIgnorePatterns: ['./src/must.ts'],
};
export default config;
