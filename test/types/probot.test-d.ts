import { RepositoryEditedEvent } from "@octokit/webhooks-types";
import { expectType } from "tsd";
import { Probot } from "../../src/index.js";

const app = new Probot({});

app.on("repository.edited", (context) => {
  expectType<RepositoryEditedEvent>(context.payload);
});
