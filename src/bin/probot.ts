import { resolve } from "node:path";

import { program } from "commander";
import { config as dotenvConfig } from "dotenv";
import { isSupportedNodeVersion } from "../helpers/is-supported-node-version.js";
import { loadPackageJson } from "../helpers/load-package-json.js";

/*import { dirname } from 'path';
import { fileURLToPath } from 'url';*/

dotenvConfig();

//const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = loadPackageJson(resolve(__dirname, "package.json"));

if (!isSupportedNodeVersion()) {
  console.log(`Node.js version 18 is required. You have ${process.version}.`);
  process.exit(1);
}

program
  .version(pkg.version || "0.0.0-dev")
  .usage("<command> [options]")
  .command("run", "run the bot")
  .command("receive", "Receive a single event and payload")
  .on("command:*", (cmd) => {
    if (!program.commands.find((c) => c.name() == cmd[0])) {
      console.error(`Invalid command: ${program.args.join(" ")}\n`);
      program.outputHelp();
      process.exit(1);
    }
  });

program.parse(process.argv);
