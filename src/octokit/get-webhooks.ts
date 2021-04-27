import { Webhooks } from "@octokit/webhooks";

import { State } from "../types";
import { getErrorHandler } from "../helpers/get-error-handler";
import { webhookTransform } from "./octokit-webhooks-transform";

import { Context } from "../context";

export function getWebhooks(state: State) {
  const webhooks = new Webhooks<Context>({
    secret: state.webhooks.secret!,
    transform: webhookTransform.bind(null, state),
  });
  webhooks.onError(getErrorHandler(state.log));
  return webhooks;
}
