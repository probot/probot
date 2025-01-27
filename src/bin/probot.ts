import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { config as dotenvConfig } from "dotenv";
import { isSupportedNodeVersion } from "../helpers/is-supported-node-version.js";
import { loadPackageJson } from "../helpers/load-package-json.js";

dotenvConfig();

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = loadPackageJson(resolve(__dirname, "package.json"));

if (!isSupportedNodeVersion()) {
  console.log(`Node.js version 18 is required. You have ${process.version}.`);
  process.exit(1);
}

function printHelp() {
  console.log(`Usage: probot <command> [options]

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  run             run the bot
  receive         Receive a single event and payload
  help [command]  display help for command
`);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: "boolean", short: "h", default: false },
    version: { type: "boolean", short: "V", default: false },
  },
});

if (values.version) {
  console.log(pkg.version || "0.0.0-dev");
  process.exit(0);
} else if (values.help || positionals.length === 0) {
  printHelp();
  process.exit(0);
} else if (positionals[0] === "run") {
  spawn(
    process.argv[0],
    [resolve(__dirname, "probot-run.js"), ...process.argv.slice(3)],
    { stdio: "inherit" },
  );
} else if (positionals[0] === "receive") {
  spawn(
    process.argv[0],
    [resolve(__dirname, "probot-receive.js"), ...process.argv.slice(3)],
    { stdio: "inherit" },
  );
} else {
  console.error(`Invalid command: ${positionals[0]}\n`);
  printHelp();
  process.exit(1);
}
