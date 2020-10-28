module.exports = {
  preset: "ts-jest",
  testEnvironment: "jest-environment-node-single-context",
  setupFilesAfterEnv: ["./jest.setup.ts"],
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.test.json",
      isolatedModules: true,
    },
  },
  maxWorkers: 1,
};
