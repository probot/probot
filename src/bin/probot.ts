import program from "commander";
import { isSupportedNodeVersion } from "../helpers/is-supported-node-version";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

const pkg = require("../../package");

if (!isSupportedNodeVersion()) {
  console.log(
    `Node.js version ${pkg.engines.node} is required. You have ${process.version}.`,
  );
  process.exit(1);
}

program
  .version(pkg.version)
  .usage("<command> [options]")
  .command("run", "run the bot")
  .command("receive", "Receive a single event and payload")
  .on("command:*", (cmd) => {
    if (!program.commands.find((c) => c._name == cmd[0])) {
      console.error(`Invalid command: ${program.args.join(" ")}\n`);
      program.outputHelp();
      process.exit(1);
    }
  });

program.parse(process.argv);
