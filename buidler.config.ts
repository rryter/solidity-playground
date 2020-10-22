import { BuidlerConfig, usePlugin } from "@nomiclabs/buidler/config";

usePlugin("@nomiclabs/buidler-waffle");
usePlugin("buidler-typechain");
usePlugin("buidler-gas-reporter");

interface ExtendedBuidlerConfig extends BuidlerConfig {
  optimizer: any;
  gasReporter: any;
}

const config: ExtendedBuidlerConfig = {
  defaultNetwork: "buidlerevm",
  solc: {
    version: "0.6.8",
  },
  optimizer: {
    runs: 200,
    enabled: true,
  },
  gasReporter: {
    currency: "CHF",
    enabled: true,
    artifactType: "buidler-v1",
    src: "./contracts",
  },
  networks: {
    buidlerevm: {
      gasPrice: 80,
      blockGasLimit: 100000000,
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v5",
  },
};
export default config;
