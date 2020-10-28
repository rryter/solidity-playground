const chokidar = require("chokidar");
const { exec } = require("child_process");

// One-liner for current directory
chokidar.watch("./contracts").on("change", (event, path) => {
  exec("npm run watcher");
});
