import { RepositoryEditedEvent } from "@octokit/webhooks-types";
import { expectType } from "tsd";
import { Probot } from "../../src";

const app = new Probot({});

app.on("repository.edited", (context) => {
  expectType<RepositoryEditedEvent>(context.payload);
});
