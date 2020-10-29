module.exports = {
  transform: {
    "^.+\\.ts$": [
      "@swc-node/jest",
      {
        target: "es2018",
        module: "commonjs",
        sourcemap: "inline",
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        dynamicImport: true,
      },
    ],
  },
  testEnvironment: "node",
  setupFilesAfterEnv: ["./jest.setup.ts"],

  maxWorkers: 2,
  logHeapUsage: true,
  testRunner: "jest-circus/runner",
  verbose: true,
};
