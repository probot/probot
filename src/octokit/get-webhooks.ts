import { WebhookEvent, Webhooks } from "@octokit/webhooks";

import { State } from "../types";
import { getErrorHandler } from "../helpers/get-error-handler";
import { webhookTransform } from "./octokit-webhooks-transform";

import { Context } from "../context";

export function getWebhooks(state: State) {
  const webhooks = new Webhooks<WebhookEvent, Context>({
    path: state.webhooks.path,
    secret: state.webhooks.secret,
    transform: webhookTransform.bind(null, state),
  });
  webhooks.on("error", getErrorHandler(state.log));
  return webhooks;
}
