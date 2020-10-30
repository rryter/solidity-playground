import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "hardhat-typechain";
// import { task } from "hardhat/config";
// import chokidar from "chokidar";

// task("tdd", "Prints a hello world message").setAction(async (taskArguments, hre, runSuper) => {
//   console.log(`Watching ${hre.config.paths.sources} for changes...`);
//   chokidar
//     .watch(hre.config.paths.sources)
//     .on("change", (event: any, path: any) => {
//       hre.run("compile");
//     })
//     .on("error", (error: Error) => {
//       console.log(`Watcher error: ${error}`);
//       process.exit(1);
//     });
// });

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
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
};

export default config;
