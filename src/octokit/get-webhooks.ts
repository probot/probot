import { Webhooks } from "@octokit/webhooks";

import type { State } from "../types.js";
import { getErrorHandler } from "../helpers/get-error-handler.js";
import { webhookTransform } from "./octokit-webhooks-transform.js";

export function getWebhooks(
  state: Pick<State, "log" | "webhooks" | "octokit">,
) {
  const webhooks = new Webhooks({
    log: state.log,
    secret: state.webhooks.secret!,
    transform: (hook) => webhookTransform(state, hook),
  });
  webhooks.onError(getErrorHandler(state.log));
  return webhooks;
}
