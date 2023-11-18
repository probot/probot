import { Webhooks } from "@octokit/webhooks";

import type { State } from "../types";
import { getErrorHandler } from "../helpers/get-error-handler";
import { webhookTransform } from "./octokit-webhooks-transform";

export function getWebhooks(state: State) {
  const webhooks = new Webhooks({
    secret: state.webhooks.secret!,
    transform: (hook) => webhookTransform(state, hook),
  });
  webhooks.onError(getErrorHandler(state.log));
  return webhooks;
}
