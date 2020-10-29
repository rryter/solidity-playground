import chokidar from "chokidar";
import { config, run } from "hardhat";

console.log(`Watching ${config.paths.sources} for changes...`);
chokidar
  .watch(config.paths.sources)
  .on("change", (event: any, path: any) => {
    run("compile");
  })
  .on("error", (error: Error) => {
    console.log(`Watcher error: ${error}`);
    process.exit(1);
  });
