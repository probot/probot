import { EventPayloads } from "@octokit/webhooks";
import { expectType } from "tsd";
import { Application } from "../../lib";

const app = new Application({});

app.on("repository.edited", (context) => {
  expectType<EventPayloads.WebhookPayloadRepository>(context.payload);
});
