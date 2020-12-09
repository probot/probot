import { EventPayloads } from "@octokit/webhooks";
import { expectType } from "tsd";
import { Probot } from "../../src";

const app = new Probot({});

app.on("repository.edited", (context) => {
  expectType<EventPayloads.WebhookPayloadRepository>(context.payload);
});
