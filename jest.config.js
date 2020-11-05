module.exports = {
  roots: ["<rootDir>/test"],
  preset: "ts-jest",
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.test.json",
      isolatedModules: true
    }
  },
  //   transform: {
  //     "^.+\\.ts$": [
  //       "@swc-node/jest",
  //       {
  //         target: "es2018",
  //         module: "commonjs",
  //         experimentalDecorators: true,
  //         emitDecoratorMetadata: true
  //       }
  //     ]
  //   },
  testEnvironment: "node",
  setupFilesAfterEnv: ["./jest.setup.ts"],
  maxWorkers: 2,
  logHeapUsage: true,
  testRunner: "jest-circus/runner",
  verbose: true,
  reporters: ["default"]
};
