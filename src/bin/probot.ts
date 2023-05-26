import program from "commander";

import dotenv from "dotenv"

dotenv.config();


program
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
