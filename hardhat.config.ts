import "@nomiclabs/hardhat-ethers";

const config = {
  solidity: {
    version: "0.6.9",
    settings: {
      optimizer: {
        enabled: true,
      },
    },
  },
  networks: {
    hardhat: {
      gasPrice: 80,
      blockGasLimit: 100000000,
    },
  },
};

export default config;
