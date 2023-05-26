import program from "commander";
import fs from "fs";
import { fileURLToPath } from "node:url";
import path from "path";
import semver from "semver";
import dotenv from "dotenv";

dotenv.config();

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../package.json"), {
    encoding: "utf-8",
  })
);

if (!semver.satisfies(process.version, pkg.engines.node)) {
  console.log(
    `Node.js version ${pkg.engines.node} is required. You have ${process.version}.`
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
