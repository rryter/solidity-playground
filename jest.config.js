module.exports = {
  preset: "ts-jest",
  testEnvironment: "jest-environment-node-single-context", // https://github.com/facebook/jest/issues/2549
  setupFilesAfterEnv: ["./jest.setup.ts"],
  globals: {
    "ts-jest": {
      isolatedModules: true,
    },
  },
};
