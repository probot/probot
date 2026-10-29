import { expectType } from "tsd";
import { Probot } from "../../src/index.js";

const app = new Probot({});

app.on("repository.edited", (context) => {
  expectType<"edited">(context.payload.action);
  expectType<string>(context.payload.repository.name);
});
